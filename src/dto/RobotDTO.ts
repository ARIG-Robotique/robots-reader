import {ExecsDTO} from "./ExecsDTO";
import {Robot} from "../models/Robot";

export class RobotDTO {
    id: number;
    host: string;
    name: string;
    dir: string;
    creationDate: Date;
    execs: ExecsDTO[];

    constructor(robot?: Robot) {
        this.id = robot.id;
        this.host = robot.host;
        this.name = robot.name;
        this.dir = robot.dir;
        this.creationDate = robot.creationDate;
    }
}
