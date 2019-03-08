import {Execs} from "../models/Execs";

export class ExecsDTO {
    id: number;
    dateStart: Date;
    dateEnd: Date;
    numberExec: string;

    constructor(exec?: Execs) {
        this.id = exec.id;
        this.dateStart = exec.dateStart;
        this.dateEnd = exec.dateEnd;
        this.numberExec  = exec.numberExec;
    }
}
