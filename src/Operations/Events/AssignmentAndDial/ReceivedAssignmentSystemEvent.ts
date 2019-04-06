import { Event } from "../../../Entities/Event";
import { IEventOperation } from "./../IEventOperation";

export class ReceivedAssignmentSystemEvent implements IEventOperation {
    public CanProcess(line: string): boolean {
        // tslint:disable-next-line: max-line-length
        const reg = /^(.*?)Received AMQP message(.*?)"event":"(assignment_system_fail_assignment|assignment_system_succeed_assignment)"/;
        const result = line.match(reg);
        return result != null && result.length > 0;
    }

    public Process(line: string): Event {
        const name = this.GetEventName(line);
        const payload = this.GetPayload(line);
        const routingKey = this.GetRoutingKey(line);
        return new Event({
            correlationId: payload.object.id,
            direction: "Received",
            name,
            payload,
            routingKey,
        });
    }

    private GetEventName(line: string): string {
        // tslint:disable-next-line: max-line-length
        const reg = /^(.*?)Received AMQP message(.*?)"event":"(assignment_system_fail_assignment|assignment_system_succeed_assignment)"/;
        const result = line.match(reg);
        return result != null && result.length > 0 ? result[result.length - 1] : null;
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
