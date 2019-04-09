import * as readline from "readline";
import { table } from "table";
import { command } from "yargs";
import { DateOperation } from "../Operations/DateOperation";
import { EventTransformerOperation } from "../Operations/EventTransformerOperation";
import { TimeTransformerOperation } from "../Operations/TimeTransformerOperation";
import { Logentries } from "./../Queries/Logentries";

// tslint:disable-next-line: no-unused-expression
command(
    "sort",
    "Sort logs by date",
    {},
    sortEvents,
)
    .command(
        "timeline",
        "Parse logs and displays a timeline",
        {
            withResults: { type: "boolean", demandOption: false, alias: "r" },
        },
        timeline,
    )
    .command(
        "query",
        "Query on logentries",
        {
            hours: { type: "number", demandOption: false, alias: "h", default: 48 },
            query: { type: "string", demandOption: true, alias: "q" },
        },
        queryLogentries,
    )
    .wrap(null)
    .demandCommand(1)
    .strict(true)
    .version()
    .help("help", "Run the command you want to execute.").argv;

function readLineByLine(actionLine: (line: string) => void, actionClose: () => void) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    });

    rl.on("line", (line) => {
        if (line !== "" && line !== "/n") {
            actionLine(line);
        } else {
            rl.close();
        }
    });

    rl.on("close", () => {
        actionClose();
    });
}

function timeline({ withResults = false }) {
    execute(["event"], (events) => {
        const filteredEvents = events.filter((e) => e.event != null);
        if (withResults === false) {
            // tslint:disable-next-line: no-console
            console.table(
                filteredEvents.map((e) => {
                    return {
                        "Event Date": e.date,
                        // tslint:disable-next-line: object-literal-sort-keys
                        "Direction": e.event.direction,
                        "Event Name": e.event.name,
                        "Key": e.event.routingKey,
                        "Correlation Id": e.event.correlationId,
                    };
                }),
            );
        } else {
            const config = {
                border: {
                    bodyJoin: ` `,
                    bodyLeft: ` `,
                    bodyRight: ` `,
                },
                columns: {
                    0: {
                        alignment: "center",
                        width: 3,
                    },
                    1: {
                        alignment: "center",
                        width: 23,
                    },
                    2: {
                        alignment: "center",
                        width: 8,
                    },
                    3: {
                        alignment: "center",
                        width: 36,
                        wrapWord: true,
                    },
                    4: {
                        alignment: "center",
                        width: 40,
                        wrapWord: true,
                    },
                    5: {
                        alignment: "center",
                        width: 36,
                    },
                    6: {
                        alignment: "left",
                        width: 40,
                        wrapWord: true,
                    },
                },
            };

            const output = table(
                [[null, "Date", "<>", "Name", "Key", "Correlation Id", "Result"]].concat(
                    filteredEvents.map((e, i) => {
                        return [
                            i,
                            e.date
                                .replace("T", " ")
                                .replace(".", "")
                                .substring(0, 22),
                            e.event.direction,
                            e.event.name,
                            e.event.routingKey,
                            e.event.correlationId,
                            e.event.payload ? JSON.stringify(e.event.payload).replace(/:/g, ": ") : null,
                        ] as any;
                    }),
                ),
                config,
            );
            // tslint:disable-next-line: no-console
            console.log(output);
        }
    });
}

function sortEvents() {
    execute([], (events) => {
        events.forEach((event) => {
            // tslint:disable-next-line: no-console
            console.log(event.content);
        });
    });
}

function execute(executeOperations: string[] = [], resultCallback: (events) => void) {
    const requiredOperations = [
        { name: "date", instance: new DateOperation() },
        { name: "time", instance: new TimeTransformerOperation() },
    ];

    const availableOperations = [
        { name: "event", instance: new EventTransformerOperation() },
    ];

    const events = [];
    const operations = [
        ...requiredOperations,
        ...executeOperations.map((o) => availableOperations.find((q) => q.name === o)),
    ];

    readLineByLine((line) => {
        const event = { content: line };
        try {
            operations.forEach(((o) => {
                event[o.name] = o.instance.call(line);
            }));
            events.push(event as any);
        } catch (error) {
            // tslint:disable-next-line: no-console
            console.error(error, line);
        }
    }, () => {
        const e = [...events].sort((a, b) => a.time.localeCompare(b.time));
        resultCallback(e);
    });
}

async function queryLogentries({ query, hours }) {
    const logEntriesQuery = new Logentries();
    const messages = await logEntriesQuery.call(query, hours);
    messages.forEach((message) => {
        // tslint:disable-next-line: no-console
        console.log(message);
    });
}
