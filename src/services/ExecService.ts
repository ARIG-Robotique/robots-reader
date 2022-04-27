import fs from 'fs';
import { InfluxDB } from 'influx';
import { extend } from 'lodash';
import Queue from 'queue-promise';
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
        const dir = this.robotService.buildDir(robot);

        return this.readerLogService.getStartEnd(dir, idExec)
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

    getLogs(idRobot: number, idExec: string): Promise<Log[]> {
        return Promise.resolve(Log.findAll({
            where: { idExec },
            order: [['date', 'ASC']],
        }));
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
            where: { idExec }
        }));
    }

    findAllExecsByRobot(idRobot: number): Promise<Exec[]> {
        return this.getAllExecsByRobot(idRobot);
    }

    private insertLog(robot: Robot, exec: Exec): Promise<unknown> {
        const dir = this.robotService.buildDir(robot);
        this.log.info(`Insert logs to postgres for robot ${robot.id} exec ${exec.id}`);

        return this.readerLogService.readLogBatch(dir, exec.id, (items) => {
            const insertLogs = items.map(item => Log.fromData(item, exec.id).save());
            return Promise.resolve(insertLogs);
        });
    }

    private insertMouvementSeries(robot: Robot, exec: Exec): Promise<unknown> {
        const dir = this.robotService.buildDir(robot);
        this.log.info(`Insert mouvement to postgres for robot ${robot.id} exec ${exec.id}`);

        return this.influxService.readMouvementSeriesBatch(dir, exec.id, (items) => {
            const insertMouvements = items.map(item => Mouvement.fromData(item, exec.id).save());
            return Promise.all(insertMouvements);
        });
    }

    private insertTimeSeries(robot: Robot, exec: Exec): Promise<unknown> {
        const dir = this.robotService.buildDir(robot);
        this.log.info(`Insert timeseries to influx for robot ${robot.id} exec ${exec.id}`);

        return this.influxService.readTimeseriesBatch(dir, exec.id, (items) => {
            return this.influx.writePoints(items.map((item) => {
                return {
                    measurement: item.measurementName,
                    timestamp  : item.time,
                    tags       : extend({ idexec: exec.id, robot: robot.name }, item.tags),
                    fields     : item.fields
                };
            }), {
                database : this.config.influx.database,
                precision: 'ms'
            });
        });
    }

    private importExec(robot: Robot, execNum: string): Promise<void> {
        this.log.info(`Read log for robot ${robot.id}`);

        return this.create(robot, execNum)
            .then((exec) => {
                return Promise.all([
                    this.insertTimeSeries(robot, exec),
                    this.insertMouvementSeries(robot, exec),
                    this.insertLog(robot, exec)
                ]);
            })
            .then(() => {
                this.log.info(`Finished import logs for robot ${robot.id}`);
            });
    }

    public importExecsForRobot(idRobot: number): Promise<void> {
        this.log.info(`Import logs for robot ${idRobot}`);

        return this.robotService.findById(idRobot)
            .then((robot: Robot) => {
                const dir = this.robotService.buildDir(robot);
                this.log.info(`Read log in dir ${dir}`);

                return this.listExecs(dir)
                    .then((idsExecs) => {
                        this.log.info(`Execs : ${idsExecs}`);
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
                    const queue = new Queue({
                        concurrent: 1,
                        interval  : 0,
                        start     : false,
                    });
                    filteredExecs.forEach(execNum => {
                        queue.enqueue(() => this.importExec(robot, execNum));
                    });
                    return new Promise((resolve) => {
                        queue.on('end', resolve);
                        queue.start();
                    });
                }
            });
    }

    private getAllExecsByRobot(idRobot: number): Promise<Exec[]> {
        return Promise.resolve(Exec.findAll({
            where: { idRobot },
            order: [['id', 'ASC']],
        }));
    }

}
