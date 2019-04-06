import { IEventOperation } from "./../../events/IEventOperation";
import { IOperation } from "./../../IOperation";
import { EmittingAssignmentSystemEvent } from "./EmittingAssignmentSystemEvent";
import { EmittingPasEvent } from "./EmittingPasEvent";
import { ReceivedAssignmentSystemEvent } from "./ReceivedAssignmentSystemEvent";
import { ReceivedPasEvent } from "./ReceivedPasEvent";

export class AssignmentAndDialEventTransformerOperation implements IOperation {
    private eventOperations: IEventOperation[] = [
        new EmittingPasEvent(),
        new ReceivedPasEvent(),
        new EmittingAssignmentSystemEvent(),
        new ReceivedAssignmentSystemEvent(),
    ];
    public call(event: string) {
        const processor = this.eventOperations.find((q) => q.CanProcess(event));
        if (processor) {
            return processor.Process(event);
        }
        return null;
    }
}
