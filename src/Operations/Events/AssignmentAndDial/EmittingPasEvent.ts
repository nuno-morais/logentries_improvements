
import { Event } from "../../../Entities/Event";
import { IEventOperation } from "../IEventOperation";

export class EmittingPasEvent implements IEventOperation {
    public CanProcess(line: string): boolean {
        const reg = /^(.*?)AssignmentAndDial::Gateways::PasEventGateway - Emitting '(.*?)'/;
        const result = line.match(reg);
        return result != null && result.length > 0;
    }

    public Process(line: string): Event {
        const eventName = this.GetEventName(line);
        const payload = this.GetPayload(line);
        return new Event({
            correlationId: payload.correlation_id,
            direction: "Emitted",
            name: eventName,
            payload,
            routingKey: "pas.rooms",
        });
    }

    private GetEventName(line: string): string {
        const reg = /^(.*?)AssignmentAndDial::Gateways::PasEventGateway - Emitting '(.*?)'/;
        const result = line.match(reg);
        return result != null && result.length > 0 && result[result.length - 1];
    }

    private GetPayload(line: string): any {
        const result = line.match(/^(.*?)event_data=(.*)/);
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
        const result = line.match(/^(.*?)Emitting event for resource='(.*?)'/);
        return result != null && result.length > 0 ? result[result.length - 1] : null;
    }
}
