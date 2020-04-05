import fs from 'fs';
import { InfluxDB } from 'influx';
import { extend } from 'lodash';
import { Inject, Singleton } from 'typescript-ioc';
import { Exec } from '../models/Exec';
import { Log } from '../models/Log';
import { Mouvement } from '../models/Mouvement';
import { Robot } from '../models/Robot';
import { Config } from './Config';
import { Logger } from './Logger';
import { ReaderLogService } from './ReaderLogService';
import { ReadTimeSeriesService } from './ReadTimeSeriesService';
import { RobotService } from './RobotService';

@Singleton
export class ExecService {
    private influx: InfluxDB;

    @Inject
    private config: Config;
    @Inject
    private readerLogService: ReaderLogService;
    @Inject
    private influxService: ReadTimeSeriesService;
    @Inject
    private robotService: RobotService;
    @Inject
    private log: Logger;

    constructor() {
        this.influx = new InfluxDB(this.config.influx);
    }

    create(robot: Robot, idExec: string): Promise<Exec> {
        return this.readerLogService.getStartEnd(robot.dir, idExec)
            .then(dates => {
                const execsModel = new Exec({
                    id       : idExec,
                    idRobot  : robot.id,
                    dateStart: dates.start,
                    dateEnd  : dates.end
                });

                return execsModel.save();
            });
    }

    delete(idRobot: number, idExec: string): Promise<void> {
        return Promise.all([
            Exec.findByPk(idExec),
            this.findAllMouvementByExec(idExec),
        ])
            .then(([exec, mouvements]) => {
                const deleteMouvements = mouvements.map(mouvement => mouvement.destroy());
                return Promise.all(deleteMouvements)
                    .then(() => exec.destroy());
            });
    }

    async getPaths(idRobot: number, idExec: string): Promise<string[]> {
        const dir = await this.robotService.getDir(idRobot);

        return new Promise((resolve, reject) => {
            const path = `${dir}/path/${idExec}`;

            fs.readdir(path, (err, files) => {
                if (err) {
                    this.log.error(`Error while listing paths ${err.message}`);
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });
    }

    async getPathFile(idRobot: number, idExec: string, file: string): Promise<string> {
        const dir = await this.robotService.getDir(idRobot);
        return Promise.resolve(`${dir}/path/${idExec}/${file}`);
    }

    private findAllMouvementByExec(idExec: string): Promise<Mouvement[]> {
        return Promise.resolve(Mouvement.findAll({
            where: {idExec}
        }));
    }

    findAllExecsByRobot(idRobot: number): Promise<Exec[]> {
        return Promise.resolve(Exec.findAll({
            where: {idRobot}
        }));
    }

    private insertLog(robot: Robot, exec: Exec): Promise<unknown> {
        this.log.info(`Insert log to postgres for ${robot.id} ${robot.name} and ${exec.id}`);

        return this.readerLogService.readLogBatch(robot.dir, exec.id, (items) => {
            const logs: Log[] = items.map(item => Log.fromData(item, exec.id));
            return Promise.resolve(Log.bulkCreate(logs));
        });
    }

    private insertMouvementSeries(robot: Robot, exec: Exec): Promise<unknown> {
        this.log.info(`Insert mouvement series for ${robot.id} ${robot.name} and ${exec.id}`);

        return this.influxService.readMouvementSeriesBatch(robot.dir, exec.id, (items) => {
            const insertMouvements = items.map(item => Mouvement.fromData(item, exec.id).save());

            return Promise.all(insertMouvements);
        });
    }

    private insertTimeSeries(robot: Robot, exec: Exec): Promise<unknown> {
        this.log.info(`Insert log series to influx ${robot.id} ${robot.name} and ${exec.id}`);

        return this.influxService.readTimeseriesBatch(robot.dir, exec.id, (items) => {
            return this.influx.writePoints(items.map((item) => {
                return {
                    measurement: item.measurementName,
                    timestamp  : item.time,
                    tags       : extend({idexec: exec.id, robot: robot.name}, item.tags),
                    fields     : item.fields
                };
            }), {
                database : this.config.influx.database,
                precision: 'ms'
            });
        });
    }

    private importExec(robot: Robot, execNum: string): Promise<void> {
        this.log.info(`Read log for ${robot.id} ${robot.name}`);

        return this.create(robot, execNum)
            .then((savedExecs) => {
                return Promise.all([
                    this.insertTimeSeries(robot, savedExecs),
                    this.insertMouvementSeries(robot, savedExecs),
                    this.insertLog(robot, savedExecs)
                ]);
            })
            .then(() => {
                this.log.info(`Finished import logs for ${robot.id} ${robot.name}`);
            });
    }

    public importExecsForRobot(idRobot: number): Promise<void> {
        this.log.info(`Import logs for robot ${idRobot}`);

        return this.robotService.findById(idRobot)
            .then((robot: Robot) => {
                this.log.info(`Read log in dir ${robot.dir}`);

                return this.listExecs(robot.dir)
                    .then((idsExecs) => {
                        console.log(`Execs : ${idsExecs}`);
                        return this.importExecs(robot, idsExecs);
                    });
            });
    }

    private listExecs(dir: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (error, files: string[]) => {
                if (error) {
                    reject(error);
                } else {
                    const execsNum = files
                        .filter(file => file.split('.exec').length > 1)
                        .map(file => file.split('.')[0]);
                    resolve([...new Set(execsNum)]);
                }
            });
        });
    }

    private importExecs(robot: Robot, idsExecs: string[]): Promise<void> {
        this.log.info(`Import logs for robot ${robot.id} with execsNum: ${idsExecs}`);

        return this.getAllExecsByRobot(robot.id)
            .then((execs: Exec[]) => {
                const savedExecs = execs.map(exec => exec.id);
                const filteredExecs: string[] = idsExecs.filter(execNum => savedExecs.indexOf(execNum) === -1);

                this.log.debug(`Import ${filteredExecs.length} files`);

                if (filteredExecs.length > 0) {
                    const loadLogs = filteredExecs.map(execNum => this.importExec(robot, execNum));

                    return Promise.all(loadLogs);
                }
            })
            .then(() => null);
    }

    private getAllExecsByRobot(idRobot: number): Promise<Exec[]> {
        return Promise.resolve(Exec.findAll({
            where: {idRobot}
        }));
    }

}
