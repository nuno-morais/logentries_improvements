
import { Event } from "../../../Entities/Event";
import { IEventOperation } from "../IEventOperation";

export class EmittingAssignmentSystemEvent implements IEventOperation {
    public CanProcess(line: string): boolean {
        const reg = /^(.*?)AssignmentAndDial::Gateways::AssignmentSystemGateway - Submitting assignment job.(.*?)/;
        const result = line.match(reg);
        return result != null && result.length > 0;
    }

    public Process(line: string): Event {
        const eventName = "post_assignment_job";
        const payload = this.GetPayload(line);
        return new Event({
            correlationId: payload.correlation_id,
            direction: "Emitted",
            name: eventName,
            payload,
            routingKey: "assignment_system",
        });
    }

    private GetPayload(line: string): any {
        const result = line.match(/^(.*?)payload=(.*?)(' exhaust_mode='(.*?)')/);
        let payload = {};
        if (result != null && result.length > 2) {
            let payloadString = result[result.length - 3];
            payloadString = payloadString.replace(/"([0-9a-zA-Z_]*?)"=>/g, (a, b) => `"${b}": `);
            payloadString = payloadString.replace(/:([0-9a-zA-Z_]*?)=>/g, (a, b) => `"${b}": `);
            payloadString = payloadString.replace(/nil/g, "null");
            if (payloadString[0] === "'") {
                payloadString = payloadString.substr(1);
            }
            if (payloadString[payloadString.length - 1] === "'") {
                payloadString = payloadString.substr(0, payloadString.length - 1);
            }
            payload = {
                exhaust_mode: result[result.length - 1],
                payload: JSON.parse(payloadString),
            };
        }
        return payload;
    }
}
