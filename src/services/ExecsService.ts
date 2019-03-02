import {Execs} from "../models/Execs";
import {Robot} from "../models/Robot";
import {ExecStateEnum} from "../enum/ExecState.enum";
import {ReaderLogService} from "./ReaderLogService";
import {Service} from "./Service";
import {Log} from "../models/Log";
import {InfluxService} from "./InfluxService";
import {InfluxDB} from "influx";
import * as _ from "lodash";
import {Inject} from "typescript-ioc";
import {error} from "util";

export class ExecsService {
    private conf = require('../../conf.json');

    private influx: InfluxDB;

    @Inject
    private readerLogService: ReaderLogService;
    @Inject
    private robotService: Service;
    @Inject
    private influxService: InfluxService;

    constructor() {
        this.influxDbSetup();
    }

    public create(robotId: number, execs: Execs) {
        return new Promise<any>((resolve, reject) => {
            Robot.findById(robotId)
                .then((robot: Robot) => {
                    const execsModel = new Execs({
                        robotId: robot.id,
                        dateStart: execs.dateStart,
                        dir: execs.dir
                    });
                    console.log('save exec');
                    execsModel.save().then(savedExecs => resolve([savedExecs, robot]));
                }, (error) => reject(error))
        });
    }

    public findById(id: number) {
        return Execs.findById(id, {include: [Robot]});
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
                    console.log('finish insert log');
                    stream && stream.resume();
                    // resolve();
                }, (err) => {
                    console.log(err);
                    stream && stream.destroy();
                    reject(err);
                });
            })
                .then(result => {
                    console.log('finish insert log');
                    // stream && stream.resume();
                    resolve();
                });
        });
    }

    public insertInflux(robot: Robot, exec: Execs) {
        console.log(`Insert log to influx ${robot.id} and ${exec.dir}`);
        return new Promise((resolve, reject) => {
            this.influxService.readTimeseriesBatch(robot.dir, exec.dir, (items, stream) => {
                stream && stream.pause();
                console.log(`timeserie items ${JSON.stringify(items)}`);

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
                    console.info(`Created an exec ${JSON.stringify(result)}`);
                    Promise.all([this.insertLog(result[1].dir, savedExecs), this.insertInflux(result[1], savedExecs)])
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
