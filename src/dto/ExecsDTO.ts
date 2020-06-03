import {Exec} from '../models/Exec';

export class ExecsDTO {
    id: string;
    idRobot: number;
    dateStart: Date;
    dateEnd: Date;

    constructor(exec?: Exec) {
        this.id = exec.id;
        this.idRobot = exec.idRobot;
        this.dateStart = exec.dateStart;
        this.dateEnd = exec.dateEnd;
    }
}
