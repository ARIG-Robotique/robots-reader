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

    public loadLog(robot: Robot, execNum: string) {
        console.info(`Read log for ${robot.id}`);

        return this.create(robot, execNum)
            .then((savedExecs) => {
                return Promise.all([
                    this.insertLog(robot.dir, savedExecs),
                    this.insertTimeSeries(robot, savedExecs),
                    this.insertMouvementSeries(robot, savedExecs)
                ]);
            });
    }

    public importLogsForRobot(robotId: number) {
        console.log(`Import logs for robot ${robotId}`);

        return Robot.findByPrimary(robotId)
            .then((robot: Robot) => {
                console.log(`Read log in dir ${robot.dir}`);

                return this.listExecs(robot.dir)
                    .then((execsNum) => {
                        console.log(`Optimized Execsnum ${execsNum}`);
                        return [robot, execsNum];
                    });
            })
            .then(([robot, execsNum]: [Robot, string[]]) => {
                return this.importLogs(robot, execsNum);
            });
    }

    private listExecs(dir: string) {
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (error, files: string[]) => {
                if (error) {
                    reject(error);
                } else {
                    let execsNum = files
                        .filter(file => file.split('-').length > 1)
                        .map(file => file.split('-')[0]);
                    resolve([...new Set(execsNum)]);
                }
            });
        });
    }

    private importLogs(robot: Robot, execsNum: string[]) {
        console.log(`Import logs for robot ${robot.id} with execsNum: ${execsNum}`);

        return this.getAllExecByRobot(robot.id)
            .then((execs: Execs[]) => {
                const savedExecsNum = execs.map(exec => exec.numberExec);
                const filteredExecsNum = execsNum.filter(execNum => savedExecsNum.indexOf(execNum) === -1);

                console.log(`Import ${filteredExecsNum.length} files`);

                if (filteredExecsNum.length > 0) {
                    return Promise.all(filteredExecsNum.map(execNum => {
                        return this.loadLog(robot, execNum);
                    }));
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
                } else {
                    return Promise.resolve();
                }
            });
    }
}
