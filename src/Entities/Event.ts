export class Event {
    public correlationId: string;
    public name: string;
    public routingKey: string;
    public payload: string;
    public direction: string;

    constructor(data: Partial<Event> = {}) {
        Object.entries(data).forEach((q) => {
            this[q[0]] = q[1];
        });
    }
}
