import { Event } from "../../Entities/Event";
import { IEventOperation } from "./IEventOperation";

export class ReceivedFunctionFinished implements IEventOperation {
    public CanProcess(line: string): boolean {
        const reg = /^(.*?)Received AMQP message(.*?)"event":"function_finished"/;
        const result = line.match(reg);
        return result != null && result.length > 0;
    }

    public Process(line: string): Event {
        const payload = this.GetPayload(line);
        const routingKey = this.GetRoutingKey(line);
        return new Event({
            correlationId: payload.correlation_id,
            direction: "Received",
            name: "function_finished",
            payload,
            routingKey,
        });
    }

    private GetPayload(line: string): any {
        const result = line.match(/^(.*?)payload:(.*)/);
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

    private GetRoutingKey(line: string): string {
        const result = line.match(/^(.*?)routing_key: '(.*?)'/);
        return result != null && result.length > 0 ? result[result.length - 1] : null;
    }
}
