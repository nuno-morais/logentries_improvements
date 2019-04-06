import { AssignmentAndDialEventTransformerOperation }
    from "./Events/AssignmentAndDial/AssignmentAndDialEventTransformerOperation";
import { EmittingFunctionTriggered } from "./Events/EmittingFunctionTriggered";
import { EmittingSystemFinishStep } from "./Events/EmittingSystemFinishStep";
import { IEventOperation } from "./events/IEventOperation";
import { ReceivedFunctionFinished } from "./Events/ReceivedFunctionFinished";
import { ReceivedFunctionTriggered } from "./Events/ReceivedFunctionTriggered";
import { ReceivedTriggerFlow } from "./Events/ReceivedTriggerFlow";
import { IOperation } from "./IOperation";

export class EventTransformerOperation implements IOperation {
    private genericEventProcessors: IEventOperation[] = [
        new EmittingFunctionTriggered(),
        new EmittingSystemFinishStep(),
        new ReceivedFunctionTriggered(),
        new ReceivedFunctionFinished(),
        new ReceivedTriggerFlow(),
    ];

    private transformers: IOperation[] = [
        new AssignmentAndDialEventTransformerOperation(),
    ];
    public call(event: string) {
        const processor = this.genericEventProcessors.find((q) => q.CanProcess(event));
        try {
            if (processor) {
                return processor.Process(event);
            } else {
                for (const transformer of this.transformers) {
                    const result = transformer.call(event);
                    if (result != null) {
                        return result;
                    }
                }
            }
        } catch (err) {
            // tslint:disable-next-line: no-console
            console.error("Parsing error", event, err);
        }

        return null;
    }
}
