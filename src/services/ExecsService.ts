import {Execs} from '../models/Execs';
import {Robot} from '../models/Robot';
import {ReaderLogService} from './ReaderLogService';
import {RobotService} from './RobotService';
import {Log} from '../models/Log';
import {InfluxDB} from 'influx';
import * as _ from 'lodash';
import {Inject} from 'typescript-ioc';
import {Mouvement} from '../models/Mouvement';
import {MouvementData} from '../dto/MouvementData';
import {ReadTimeSeriesService} from './ReadTimeSeriesService';

const fs = require('fs');

export class ExecsService {
    private conf = require('../conf.json');

    private influx: InfluxDB;

    @Inject
    private readerLogService: ReaderLogService;
    @Inject
    private robotService: RobotService;
    @Inject
    private influxService: ReadTimeSeriesService;

    constructor() {
        this.influxDbSetup();
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
            }, (error: Error) => Promise.reject(error));
    }

    public delete(idExec: number): Promise<void> {

        return Promise.all([Execs.findByPk(idExec), this.getMouvementByExecsId(idExec)])
            .then(result => {
                const exec: Execs = result[0];
                const mouvements: Mouvement[] = result[1];

                const promises = [];
                mouvements.forEach(mouvement => promises.push(mouvement.destroy()));

                return Promise.all(promises)
                    .then(() => {
                        return exec.destroy();
                    });
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
        console.info(`Insert log to postgres for ${robotDir} and ${exec.numberExec}`);

        return this.readerLogService.readLogBatch(robotDir, exec.numberExec, (items) => {
            return Promise.all(items.map(item => {
                return this.logMapper(item, exec.id).save();
            }));
        });
    }

    private mouvementMapper(item, execId: number): Mouvement {
        const mouvement = new Mouvement();
        mouvement.execsId = execId;
        mouvement.type = item.type;
        mouvement.distance = item.distance;
        const mouvementData = new MouvementData();

        if (item.type === 'PATH') {
            mouvementData.path = JSON.parse(JSON.stringify(item.path));
        } else {
            mouvementData.fromPoint = JSON.parse(JSON.stringify(item.fromPoint));
            mouvementData.toPoint = JSON.parse(JSON.stringify(item.toPoint));
        }

        mouvement.data = mouvementData;
        mouvement.time = new Date(item.time);


        return mouvement;
    }

    public insertMouvementSeries(robot: Robot, exec: Execs): Promise<void> {

        console.log(`Insert mouvement series for ${robot.id} ${robot.name}`);

        return new Promise((resolve, reject) => {
            this.influxService.readMouvementSeriesBatch(robot.dir, exec.numberExec, (items, stream) => {
                const promises = [];

                stream && stream.pause();

                for (let i = 0; i < items.length; i++) {
                    promises.push(this.mouvementMapper(items[i], exec.id).save());
                }

                Promise.all(promises).then(() => {
                    stream && stream.resume();
                }, (err: Error) => {
                    stream && stream.destroy();
                    console.warn(`Error while processing mouvement file for ${robot.id} ${robot.name} with error ${err.stack}`);
                    resolve();
                });
            })
                .then((result) => resolve(result));
        });
    }

    public insertTimeSeries(robot: Robot, exec: Execs): Promise<any> {
        console.log(`Insert log series to influx ${robot.id} ${robot.name} and ${exec.numberExec}`);

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
        console.info(`Read log for ${robot.id} ${robot.name}`);

        return this.create(robot, execNum)
            .then((savedExecs) => {
                    return Promise.all([
                        this.insertTimeSeries(robot, savedExecs),
                        this.insertMouvementSeries(robot, savedExecs),
                        this.insertLog(robot.dir, savedExecs)
                    ]).then(() => undefined);
                }
            );
    }

    public importLogsForRobot(robotId: number): Promise<void> {
        console.log(`Import logs for robot ${robotId}`);

        return Promise.resolve(
            Robot.findByPk(robotId)
                .then((robot: Robot) => {
                    console.log(`Read log in dir ${robot.dir}`);

                    return this.listExecs(robot.dir)
                        .then((execsNum) => {
                            console.log(`Optimized Execsnum ${execsNum}`);
                            return [robot, execsNum];
                        }, (error) => Promise.reject(error));
                })
                .then(([robot, execsNum]: [Robot, string[]]) => this.importLogs(robot, execsNum))
        );
    }

    private listExecs(dir: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (error, files: string[]) => {
                if (error) {
                    reject(error);
                } else {
                    let execsNum = files
                        .filter(file => file.split('.exec').length > 1)
                        .map(file => file.split('.')[0]);
                    resolve([...new Set(execsNum)]);
                }
            });
        });
    }

    private importLogs(robot: Robot, execsNum: string[]): Promise<void> {
        console.log(`Import logs for robot ${robot.id} with execsNum: ${execsNum}`);

        return this.getAllExecByRobot(robot.id)
            .then((execs: Execs[]) => {
                const savedExecsNum = execs.map(exec => exec.numberExec);
                const filteredExecsNum: string[] = execsNum.filter(execNum => savedExecsNum.indexOf(execNum) === -1);

                console.log(`Import ${filteredExecsNum.length} files`);

                if (filteredExecsNum.length > 0) {
                    const promises = [];

                    filteredExecsNum.forEach(execNum => {
                        promises.push(this.loadLog(robot, execNum));
                    });

                    return Promise.all(promises)
                        .then(() => undefined);
                }
            });
    }

    private getAllExecByRobot(robotId: number): Promise<Execs[]> {
        return Promise.resolve(Execs.findAll({
            where: {
                robotId: robotId,
            }
        }));
    }

    private influxDbSetup(): void {
        this.influx = new InfluxDB(this.conf.influx);
        this.influx.getDatabaseNames()
            .then((names) => {
                if (!_.find(names, this.conf.influx.database)) {
                    return this.influx.createDatabase(this.conf.influx.database);
                } else {
                    return Promise.resolve();
                }
            });
    }
}
