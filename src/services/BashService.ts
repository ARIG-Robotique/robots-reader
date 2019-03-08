import {Service} from "./Service";
import {Inject} from "typescript-ioc";
import {Robot} from "../models/Robot";
import * as child from 'child_process';


export class BashService {
    readonly GET_LOGS_SH = '../scripts/getLogs.sh';

    @Inject
    private robotService: Service;

    private exec: any;

    constructor() {
        this.exec = child.exec;
    }

    public copyAllLog(robotsId: number[]) {
        const promises = [];

        robotsId.forEach((robotId: number) => {
            promises.push(this.copyRobotLogs(robotId));
        });

        return Promise.all(promises)
            .then(() => 'finished');
    }

    private copyRobotLogs(robotId: number) {
        return new Promise((resolve, reject) => {
            this.robotService.findById(robotId)
                .then((robot: Robot) => {
                    this.exec(this.GET_LOGS_SH + ' ' + robot.host, (error: string, stdout: string, stderr: string) => {
                        console.log(`Finished copy logs for robot ${robotId} with log ${stdout}`);
                        resolve();
                    });
                });
        });
    }

}
