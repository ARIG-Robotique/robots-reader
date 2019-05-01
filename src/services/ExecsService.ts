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

    public create(robot: Robot, execs: Execs) {
        return new Promise<any>((resolve, reject) => {
            this.readerLogService.getStartEnd(robot.dir, execs.numberExec)
                .then(dates => {
                    const execsModel = new Execs({
                        robotId: robot.id,
                        numberExec: execs.numberExec,
                        dateStart: dates.start,
                        dateEnd: dates.end
                    });
                    execsModel.save().then(savedExecs => resolve([savedExecs, robot]));
                }, (err) => reject(err));
        });
    }

    public delete(idExec: number) {

        return Promise.all([Execs.findByPrimary(idExec), this.getMouvementByExecsId(idExec)])
            .then(result => {
                const exec: Execs = result[0];
                const mouvements: Mouvement[] = result[1];

                var promises = [];
                mouvements.forEach(mouvement => promises.push(mouvement.destroy()));

                return Promise.all(promises)
                    .then(result => {
                        return exec.destroy();
                    });
            });
    }

    private getMouvementByExecsId(idExec: number) {
        return Mouvement.findAll({
            where: {
                execsId: idExec
            }
        });
    }

    public findAllExecsByRobotId(robotId: number) {
        return Execs.findAll({
            where: {
                robotId: robotId
            }
        });
    }

    public insertLog(robotDir, exec: Execs) {
        console.info(`Insert log to postgres ${robotDir} and ${exec.numberExec}`);
        let promises = [];
        return new Promise<any>((resolve, reject) => {
            this.readerLogService.readLogBatch(robotDir, exec.numberExec, (items, stream) => {
                stream && stream.pause();
                for (let i = 0; i < items.length; i++) {
                    promises.push(this.logMapper(items[i], exec.id).save());
                }

                Promise.all(promises).then(() => {
                    stream && stream.resume();
                }, (err) => {
                    console.log(err);
                    // stream && stream.destroy();
                    reject(err);
                });
            })
                .then(() => {
                    console.log('finish insert log');
                    resolve();
                });
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

    public insertMouvementSeries(robot: Robot, exec: Execs) {
        let promises = [];

        return new Promise((resolve, reject) => {
            this.influxService.readMouvementSeriesBatch(robot.dir, exec.numberExec, (items, stream) => {
                stream && stream.pause();

                for (let i = 0; i < items.length; i++) {
                    promises.push(this.mouvementMapper(items[i], exec.id).save());
                }

                Promise.all(promises).then(() => {
                    stream && stream.resume();
                }, (err) => {
                    console.log(err);
                    stream && stream.destroy();
                    reject(err);
                });
            })
                .then((result) => resolve(result))
                .catch((error) => reject(error));
        });
    }

    public insertTimeSeries(robot: Robot, exec: Execs) {
        console.log(`Insert log series into influx ${robot.id} and ${exec.numberExec}`);
        return new Promise((resolve, reject) => {
            this.influxService.readTimeseriesBatch(robot.dir, exec.numberExec, (items, stream) => {
                stream && stream.pause();

                this.influx.writePoints(items.map((item) => {
                    return {
                        measurement: item.measurementName,
                        timestamp: item.time,
                        tags: _.extend({idexec: exec.id, robot: robot.name}, item.tags),
                        fields: item.fields
                    };
                }), {
                    database: this.conf.influx.database,
                    precision: 'ms'
                })
                    .then(() => {
                        stream && stream.resume();
                    })
                    .catch((err) => {
                        console.error(err);
                        stream && stream.destroy();
                        reject(err);
                    });
            })
                .then((result) => resolve(result))
                .catch((error) => reject(error));
        });
    }

    private logMapper(item, idExecs) {
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

    public loadLog(robot: Robot, execs: Execs) {
        console.info(`Read log for ${robot.id}`);
        return this.create(robot, execs)
            .then((result) => {
                const savedExecs = result[0];
                return Promise.all([
                    this.insertTimeSeries(result[1], savedExecs)])
            });
    }

    public importLogsForRobot(robotId: number) {
        console.log(`Import logs for robot ${robotId}`);
        return new Promise((resolve, reject) => {
            Robot.findByPrimary(robotId)
                .then((robot: Robot) => {
                    console.log(`Read log in dir ${robot.dir}`);
                    fs.readdir(robot.dir, (error, files: string[]) => {
                        if (error) {
                            reject(error);
                        }
                        else {
                            let execsNum = files.filter(file => file.split('-').length > 1)
                                .map(file => file.split('-')[0]);
                            const optimizedExecsNum = [...new Set(execsNum)];
                            console.log(`Optimized Execsnum ${optimizedExecsNum}`);
                            this.importLogs(robot, optimizedExecsNum)
                                .then(() => resolve(),
                                    (err) => reject(err));
                        }
                    });
                }, error => reject(error));
        });
    }

    private importLogs(robot: Robot, execsNum: string[]) {
        console.log(`Import logs for robot ${robot.id} with execsNum: ${execsNum}`);
        return this.getAllExecByRobot(robot.id)
            .then((execs: Execs[]) => {
                const savedExecsNum = execs.map(exec => exec.numberExec);
                execsNum = execsNum.filter(execNum => savedExecsNum.indexOf(execNum) === -1);
                console.log(`Import ${execsNum.length} files`);
                if (execsNum.length > 0) {
                    const promises = [];
                    execsNum.forEach(execNum => {
                        const execs = new Execs();
                        execs.numberExec = execNum;
                        promises.push(this.loadLog(robot, execs));
                    });

                    return Promise.all(promises);
                }
            });
    }

    private getAllExecByRobot(robotId: number) {
        return Execs.findAll({
            where: {
                robotId: robotId,
            }
        });
    }

    private influxDbSetup(): void {
        this.influx = new InfluxDB(this.conf.influx);
        this.influx.getDatabaseNames()
            .then((names) => {
                if (!_.find(names, this.conf.influx.database)) {
                    return this.influx.createDatabase(this.conf.influx.database);
                }
                else {
                    return Promise.resolve();
                }
            });
    }
}
