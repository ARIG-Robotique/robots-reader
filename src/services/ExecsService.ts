import {Execs} from '../models/Execs';
import {Robot} from '../models/Robot';
import {ReaderLogService} from './ReaderLogService';
import {RobotService} from './RobotService';
import {Log} from '../models/Log';
import {InfluxDB} from 'influx';
import * as _ from 'lodash';
import {Inject, Singleton} from 'typescript-ioc';
import {Mouvement} from '../models/Mouvement';
import {MouvementData} from '../dto/MouvementData';
import {ReadTimeSeriesService} from './ReadTimeSeriesService';
import {Logger} from "./Logger";
import * as fs from 'fs';

@Singleton
export class ExecsService {
    private conf = require('../conf.json');

    private influx: InfluxDB;

    @Inject
    private readerLogService: ReaderLogService;
    @Inject
    private robotService: RobotService;
    @Inject
    private influxService: ReadTimeSeriesService;
    @Inject
    private log: Logger;

    constructor() {
        this.influx = new InfluxDB(this.conf.influx);
    }

    public create(robot: Robot, execNum: string): Promise<Execs> {
        return this.readerLogService.getStartEnd(robot.dir, execNum)
            .then(dates => {
                const execsModel = new Execs({
                    robotId: robot.id,
                    numberExec: execNum,
                    dateStart: dates.start,
                    dateEnd: dates.end
                });

                return execsModel.save();
            });
    }

    public delete(idExec: number): Promise<void> {
        return Promise.all([
            Execs.findByPk(idExec),
            this.getMouvementByExecsId(idExec)
        ])
            .then(([exec, mouvements]) => {
                const deleteMouvements = mouvements.map(mouvement => mouvement.destroy());
                return Promise.all(deleteMouvements)
                    .then(() => exec.destroy());
            });
    }

    private getMouvementByExecsId(idExec: number): Promise<Mouvement[]> {
        return Promise.resolve(Mouvement.findAll({
            where: {
                execsId: idExec
            }
        }));
    }

    public findAllExecsByRobotId(robotId: number): Promise<Execs[]> {
        return Promise.resolve(Execs.findAll({
            where: {
                robotId: robotId
            }
        }));
    }

    public insertLog(robotDir, exec: Execs): Promise<any> {
        this.log.info(`Insert log to postgres for ${robotDir} and ${exec.numberExec}`);

        return this.readerLogService.readLogBatch(robotDir, exec.numberExec, (items) => {
            const logs: Log[] = items.map(item => this.logMapper(item, exec.id));
            return Promise.resolve(Log.bulkCreate(logs));
        });
    }

    public insertMouvementSeries(robot: Robot, exec: Execs): Promise<void> {
        this.log.info(`Insert mouvement series for ${robot.id} ${robot.name}`);

        return new Promise((resolve, reject) => {
            this.influxService.readMouvementSeriesBatch(robot.dir, exec.numberExec, (items, stream) => {
                stream && stream.pause();

                const insertMouvements = items.map(item => this.mouvementMapper(item, exec.id).save());

                Promise.all(insertMouvements)
                    .then(() => {
                        stream && stream.resume();
                    }, (err: Error) => {
                        stream && stream.destroy();
                        this.log.warn(`Error while processing mouvement file for ${robot.id} ${robot.name} with error ${err.stack}`);
                        resolve();
                    });
            })
                .then(resolve, reject);
        });
    }

    public insertTimeSeries(robot: Robot, exec: Execs): Promise<any> {
        this.log.info(`Insert log series to influx ${robot.id} ${robot.name} and ${exec.numberExec}`);

        return this.influxService.readTimeseriesBatch(robot.dir, exec.numberExec, (items) => {
            return this.influx.writePoints(items.map((item) => {
                return {
                    measurement: item.measurementName,
                    timestamp: item.time,
                    tags: _.extend({idexec: exec.id, robot: robot.name}, item.tags),
                    fields: item.fields
                };
            }), {
                database: this.conf.influx.database,
                precision: 'ms'
            });
        });
    }

    private mouvementMapper(item, execId: number): Mouvement {
        const mouvement = new Mouvement();
        mouvement.execsId = execId;
        mouvement.type = item.type;
        mouvement.distance = item.distance;
        mouvement.time = new Date(item.time);
        mouvement.data = new MouvementData();

        if (item.type === 'PATH') {
            mouvement.data.path = JSON.parse(JSON.stringify(item.path));
        } else {
            mouvement.data.fromPoint = JSON.parse(JSON.stringify(item.fromPoint));
            mouvement.data.toPoint = JSON.parse(JSON.stringify(item.toPoint));
        }

        return mouvement;
    }

    private logMapper(item, idExecs): Log {
        const log = new Log();
        log.clazz = item.class;
        log.date = item.date;
        log.level = item.level;
        log.thread = item.thread;
        log.message = item.message;
        log.idExec = item.idexec;
        log.idExecs = idExecs;
        return log;
    }

    public loadLog(robot: Robot, execNum: string): Promise<void> {
        this.log.info(`Read log for ${robot.id} ${robot.name}`);

        return this.create(robot, execNum)
            .then((savedExecs) => {
                return Promise.all([
                    this.insertTimeSeries(robot, savedExecs),
                    this.insertMouvementSeries(robot, savedExecs),
                    this.insertLog(robot.dir, savedExecs)
                ]);
            })
            .then(() => {
                this.log.info(`Finished import logs for ${robot.id} ${robot.name}`);
            });
    }

    public importLogsForRobot(robotId: number): Promise<void> {
        this.log.info(`Import logs for robot ${robotId}`);

        return this.robotService.findById(robotId)
            .then((robot: Robot) => {
                this.log.info(`Read log in dir ${robot.dir}`);

                return this.listExecs(robot.dir)
                    .then((execsNum) => {
                        console.log(`Optimized Execsnum ${execsNum}`);
                        return this.importLogs(robot, execsNum);
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

    private importLogs(robot: Robot, execsNum: string[]): Promise<void> {
        this.log.info(`Import logs for robot ${robot.id} with execsNum: ${execsNum}`);

        return this.getAllExecByRobot(robot.id)
            .then((execs: Execs[]) => {
                const savedExecsNum = execs.map(exec => exec.numberExec);
                const filteredExecsNum: string[] = execsNum.filter(execNum => savedExecsNum.indexOf(execNum) === -1);

                this.log.debug(`Import ${filteredExecsNum.length} files`);

                if (filteredExecsNum.length > 0) {
                    const loadLogs = filteredExecsNum.map(execNum => this.loadLog(robot, execNum));

                    return Promise.all(loadLogs);
                }
            })
            .then(() => undefined);
    }

    private getAllExecByRobot(robotId: number): Promise<Execs[]> {
        return Promise.resolve(Execs.findAll({
            where: {
                robotId: robotId,
            }
        }));
    }

}
