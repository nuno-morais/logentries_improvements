import * as from2 from "from2";
import * as pump from "pump";
import * as rrs from "request-retry-stream";
import * as through2 from "through2";

/**
 * Copy from https://github.com/Oligrand/query-logentries
 * because our logs are not JSON objects.
 */
export function queryLogentriesFactory(apiKey, queryUrl) {
    if (!apiKey) { throw new Error('"apiKey" must be defined'); }

    const defaultRequestOpts: any = {
        headers: { "x-api-key": apiKey },
        json: true,
    };
    queryUrl = queryUrl || "https://rest.logentries.com/query/logs";

    return (opts, callback) => {
        if (!opts.logId) { throw new Error('"logId" must be defined'); }
        if (!opts.from) { throw new Error('"from" must be defined'); }

        const to = opts.to || Date.now();
        const query = opts.query || "where()";
        const perPage = opts.perPage || 50;
        defaultRequestOpts.timeout = opts.timeout || 30000;
        const pollInterval = opts.pollInterval || 3000;

        let currentBatch = [];
        let nextPageUrl = `${queryUrl}/${opts.logId}`;
        const requestOpts: any = Object.assign({}, defaultRequestOpts, {
            qs: {
                from: new Date(opts.from).getTime(),
                per_page: perPage,
                query,
                to: new Date(to).getTime(),
            },
        });
        const stream = from2.obj((size, next) => {
            if (currentBatch.length > 0) {
                return next(null, currentBatch.shift());
            }
            if (nextPageUrl) {
                requestOpts.url = nextPageUrl;
                return requestQuery(requestOpts, (err, newBatch, pageUrl) => {
                    if (err) {
                        return next(err);
                    }
                    if (newBatch.length < 1) {
                        return next(null, null);
                    }
                    currentBatch = newBatch;
                    nextPageUrl = pageUrl;
                    delete requestOpts.qs; // remove query as it is not needed in case of paging
                    next(null, currentBatch.shift());
                });
            }
            next(null, null);
        });

        if (!callback) {
            return stream;
        }

        const result = [];
        const concatStream = through2.obj((message, enc, cb) => {
            result.push(message);
            cb();
        });
        pump(stream, concatStream, (err) => {
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });

        function requestQuery(reqOpts, cb) {
            rrs.get(reqOpts, (err, res, body) => {
                if (err) {
                    return cb(err);
                }
                if (res.statusCode === 202 && hasLink(body)) {
                    return waitForResult(body.links[0].href);
                }
                cb(new Error("did not receive poll endpoint from logEntries"));
            });

            function waitForResult(pollUrl) {
                const pollOpts = Object.assign({}, defaultRequestOpts, {
                    url: pollUrl,
                });
                poll();

                function poll() {
                    rrs.get(pollOpts, (err, res, pollBody) => {
                        if (err) {
                            return cb(err);
                        }
                        if (pollBody.progress !== undefined && pollBody.progress < 100) {
                            return setTimeout(poll, pollInterval);
                        }
                        if (res.statusCode === 200 && hasLink(pollBody) && pollBody.links[0].rel === "Next") {
                            return extractMessages(pollBody, opts, (err1, messages) => {
                                if (err1) {
                                    return cb(err1);
                                }
                                cb(null, messages, pollBody.links[0].href);
                            });
                        }

                        extractMessages(pollBody, opts, cb);
                    });
                }
            }
        }
    };
}

function hasLink(body) {
    return Array.isArray(body.links) && body.links[0];
}

function extractMessages(body, opts, cb) {
    if (!body.events) {
        return cb(null, []);
    }

    try {
        const messages = body.events.map((event) => {
            if (!event.message) {
                return null;
            }
            try {
                return event.message;
            } catch (e) {
                if (opts.ignoreInvalidJson) {
                    return null;
                }
                if (typeof opts.onInvalidJson === "function") {
                    return opts.onInvalidJson(event.message);
                }
                throw e;
            }
        }).filter(Boolean);

        return cb(null, messages);
    } catch (e) {
        return cb(e);
    }
}
