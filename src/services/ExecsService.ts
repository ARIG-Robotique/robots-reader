import {Execs} from '../models/Execs';
import {Robot} from '../models/Robot';
import {ExecStateEnum} from '../enum/ExecState.enum';
import {ReaderLogService} from './ReaderLogService';
import {Service} from './Service';
import {Log} from '../models/Log';
import {InfluxDB} from 'influx';
import * as _ from 'lodash';
import {Inject} from 'typescript-ioc';
import {Mouvement} from '../models/Mouvement';
import {MouvementData} from '../dto/MouvementData';
import {ReadTimeSeriesService} from './ReadTimeSeriesService';
import {ExecsDTO} from "../dto/ExecsDTO";

export class ExecsService {
    private conf = require('../../conf.json');

    private influx: InfluxDB;

    @Inject
    private readerLogService: ReaderLogService;
    @Inject
    private robotService: Service;
    @Inject
    private influxService: ReadTimeSeriesService;

    constructor() {
        this.influxDbSetup();
    }

    public create(robotId: number, execs: Execs) {
        return new Promise<any>((resolve, reject) => {
            Robot.findById(robotId)
                .then((robot: Robot) => {
                    this.readerLogService.getStartEnd(robot.dir, execs.dir)
                        .then(dates => {
                            const execsModel = new Execs({
                                robotId: robot.id,
                                dir: execs.dir,
                                dateStart: dates.start,
                                dateEnd: dates.end
                            });
                            console.log('save exec');
                            execsModel.save().then(savedExecs => resolve([savedExecs, robot]));
                        }, (err) => reject(err));
                }, (error) => reject(error))
        });
    }

    public findById(id: number) {
        return Execs.findById(id, {include: [Robot]});
    }

    public findAllExecsByRobotId(robotId: number) {
        return Execs.findAll({
            where: {
                robotId: robotId
            }
        }).then((execs: Execs[]) => {
            return execs.map(exec => new ExecsDTO(exec));
        });
    }

    public update(id, exec: Execs) {
        return Execs.update({
            dateEnd: exec.dateEnd,
            state: ExecStateEnum.DONE
        }, {where: {id: id}});
    }

    public insertLog(robotDir, exec: Execs) {
        console.info(`Insert log to postgres ${robotDir} and ${exec.dir}`);
        let promises = [];
        return new Promise<any>((resolve, reject) => {
            this.readerLogService.readLogBatch(robotDir, exec.dir, (items, stream) => {
                stream && stream.pause();
                for (let i = 0; i < items.length; i++) {
                    promises.push(this.logMapper(items[i], exec.id).save());
                }

                Promise.all(promises).then(() => {
                    stream && stream.resume();
                }, (err) => {
                    console.log(err);
                    stream && stream.destroy();
                    reject(err);
                });
            })
                .then(result => {
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
            this.influxService.readMouvementSeriesBatch(robot.dir, exec.dir, (items, stream) => {
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
        console.log(`Insert log series into influx ${robot.id} and ${exec.dir}`);
        return new Promise((resolve, reject) => {
            this.influxService.readTimeseriesBatch(robot.dir, exec.dir, (items, stream) => {
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

    public loadLog(robotId: number, execs: Execs) {
        console.info(`Read log for ${robotId}`);
        return new Promise((resolve, reject) => {
            this.create(robotId, execs)
                .then((result) => {
                    const savedExecs = result[0];
                    Promise.all([this.insertLog(result[1].dir, savedExecs), this.insertTimeSeries(result[1], savedExecs), this.insertMouvementSeries(result[1], savedExecs)])
                        .then(() => resolve())
                        .catch((err) => reject(err));
                }, error => reject(error));
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
