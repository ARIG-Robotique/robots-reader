import {Exec} from '../models/Exec';

export class ExecsDTO {
    id: string;
    dateStart: Date;
    dateEnd: Date;

    constructor(exec?: Exec) {
        this.id = exec.id;
        this.dateStart = exec.dateStart;
        this.dateEnd = exec.dateEnd;
    }
}
