import * as dotenv from "dotenv";
import * as moment from "moment";
import { queryLogentriesFactory } from "./QueryLogentriesLib";
dotenv.config();

export class Logentries {
    private queryUrl = "https://rest.logentries.com/query/logs";

    private opts: any = {
        from: "2019-01-01T00:00:00.000",
        logId: "c86bed4a-3413-4c8a-adb2-534c23746373",
        perPage: 500,
        pollInterval: 3000,
        timeout: 30000,
        to: new Date(),
    };

    public async call(query: string, hours: number = 12): Promise<string[]> {
        this.opts.to = moment().toDate();
        this.opts.from = moment().subtract({ hours }).toDate();
        this.opts.query = query;
        const logentries = JSON.parse(process.env.LOGENTRIES_API_KEY_LOG_ID);
        const promises = [];
        Object.entries(logentries).forEach((config) => {
            const promise = new Promise<string[]>((resolve, reject) => {
                const apiKey = config[0];
                this.opts.logId = config[1];
                const queryLogentries = queryLogentriesFactory(apiKey, this.queryUrl);
                queryLogentries(this.opts, (err, messages) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(messages);
                    }
                });
            });
            promises.push(promise);
        });
        return Promise.all(promises).then((messages: string[]) => this.flatten(messages));
    }

    private flatten(list) {
        return list.reduce((a, b) => a.concat(Array.isArray(b) ? this.flatten(b) : b), []);
    }
}
