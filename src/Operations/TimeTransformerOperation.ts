import { DateOperation } from "./DateOperation";
import { IOperation } from "./IOperation";

export class TimeTransformerOperation implements IOperation {
    private dateTransformer;
    public constructor() {
        this.dateTransformer = new DateOperation();
    }
    public call(event: string): string {
        const date = this.dateTransformer.call(event);
        return date.replace(new RegExp(/T|:|-|\./, "g"), "");
    }
}
