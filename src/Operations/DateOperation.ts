import { IOperation } from "./IOperation";

export class DateOperation implements IOperation {
    public call(event: string): string {
        const reg = /^(.*?)(.*?)([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6})/;
        const result = event.match(reg);
        return result[result.length - 1];
    }
}
