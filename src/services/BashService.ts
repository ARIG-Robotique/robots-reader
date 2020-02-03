import {RobotService} from './RobotService';
import {Inject, Singleton} from 'typescript-ioc';
import {Robot} from '../models/Robot';
import child from 'child_process';
import {Logger} from './Logger';

@Singleton
export class BashService {
    readonly GET_LOGS_SH = './scripts/getLogs.sh';

    private conf = require('../conf.json');

    @Inject
    private robotService: RobotService;
    @Inject
    private log: Logger;

    copyAllLog(robotId: number): Promise<void> {
        this.log.info(`Copy logs for robot ${robotId}`);

        return this.robotService.findById(robotId)
            .then((robot: Robot) => {
                const host = robot.host.split(':')[0];

                this.log.info(`Copy all logs for ${robotId} ${robot.name} from ${host} to ${this.conf.logsOutput}`);

                return new Promise((resolve, reject) => {
                    const getLogs = child.spawn(this.GET_LOGS_SH, [host, robot.name, this.conf.logsOutput + '/' + robot.id, robot.login, robot.pwd], {
                        cwd: process.cwd()
                    });

                    getLogs.stdout.on('data', data => {
                        this.log.debug(`[getLogs.sh] ${data}`);
                    });
                    getLogs.stderr.on('data', data => {
                        this.log.error(`[getLogs.sh] ${data}`);
                    });

                    getLogs.on('close', (code) => {
                        if (code === 0) {
                            this.log.info(`Finished copy logs for robot ${robotId}`);
                            resolve();
                        } else {
                            this.log.error(`Failed copy logs for robot ${robotId}`);
                            reject();
                        }
                    });
                });
            });
    }

}
