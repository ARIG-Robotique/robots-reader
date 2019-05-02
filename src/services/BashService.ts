import {RobotService} from './RobotService';
import {Inject} from 'typescript-ioc';
import {Robot} from '../models/Robot';
import * as child from 'child_process';


export class BashService {
    readonly GET_LOGS_SH = './scripts/getLogs.sh';

    @Inject
    private robotService: RobotService;

    private conf = require('../conf.json');

    public copyAllLog(robotsId: number[]): Promise<void> {
        const promises = [];

        console.log(`Copy logs for robots ${robotsId}`);

        robotsId.forEach((robotId: number) => {
            promises.push(this.copyRobotLogs(robotId));
        });

        return Promise.all(promises)
            .then(() => Promise.resolve(),
                () => Promise.reject());
    }

    private copyRobotLogs(robotId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.robotService.findById(robotId)
                .then((robot: Robot) => {
                    const host = robot.host.split(':')[0];

                    console.log(`Copy all logs for ${robotId} ${robot.name} from ${host} to ${this.conf.logsOutput}`);

                    child.spawn(this.GET_LOGS_SH, [host, robot.name, this.conf.logsOutput], {
                        stdio: 'inherit',
                        cwd: process.cwd()
                    })
                        .on('close', (code) => {
                            if (code === 0) {
                                console.log(`Finished copy logs for robot ${robotId}`);
                                resolve();
                            } else {
                                console.error(`Failed copy logs for robot ${robotId}`);
                                reject();
                            }
                        });
                });
        });
    }

}
