import { Event } from "../../Entities/Event";
import { IEventOperation } from "./IEventOperation";

export class EmittingSystemFinishStep implements IEventOperation {
    public CanProcess(line: string): boolean {
        const reg = /^(.*?)Emitting system_finish_step(.*?)(verb=>"finish")/;
        const result = line.match(reg);
        return result != null && result.length > 0;
    }

    public Process(line: string): Event {
        const payload = this.GetPayload(line);
        const correlationId = this.GetCorrelationId(line);
        return new Event({
            correlationId,
            direction: "Emitted",
            name: "system_finish_step",
            payload,
            routingKey: null,
        });
    }

    private GetPayload(line: string): any {
        const result = line.match(/^(.*?)event: (.*)/);
        let payload = {};
        if (result != null) {
            let payloadString = result[result.length - 1];
            payloadString = payloadString.replace(/"([0-9a-zA-Z_]*?)"=>/g, (a, b) => `"${b}": `);
            payloadString = payloadString.replace(/:([0-9a-zA-Z_]*?)=>/g, (a, b) => `"${b}": `);
            payloadString = payloadString.replace(/nil/g, "null");
            if (payloadString[0] === "'") {
                payloadString = payloadString.substr(1);
            }
            if (payloadString[payloadString.length - 1] === "'") {
                payloadString = payloadString.substr(0, payloadString.length - 1);
            }
            payload = JSON.parse(payloadString);
        }
        return payload;
    }

    private GetCorrelationId(line: string): string {
        const result = line.match(/^(.*?):type=>"step", :id=>"(.*?)"/);
        return result != null && result.length > 0 ? result[result.length - 1] : null;
    }
}
