import { Event } from "../../Entities/Event";

export interface IEventOperation {
    CanProcess(line: string): boolean;
    Process(line: string): Event;
}
