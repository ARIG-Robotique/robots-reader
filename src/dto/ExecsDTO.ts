import {Execs} from "../models/Execs";

export class ExecsDTO {
    id: number;
    dateStart: Date;
    dateEnd: Date;
    dir: string;

    constructor(exec?: Execs) {
        this.id = exec.id;
        this.dateStart = exec.dateStart;
        this.dateEnd = exec.dateEnd;
        this.dir  = exec.dir;
    }
}
