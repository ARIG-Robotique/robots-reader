import {Execs} from "../models/Execs";
import {Robot} from "../models/Robot";
import {ExecStateEnum} from "../enum/ExecState.enum";
import {ReaderLogService} from "./ReaderLogService";
import {Service} from "./Service";
import {Log} from "../models/Log";

export class ExecsService {

    private readerLogService: ReaderLogService;
    private robotService: Service;

    constructor() {
        this.readerLogService = new ReaderLogService();
        this.robotService = new Service();
    }

    public create(robotId: number, execs: Execs) {
        return new Promise<any>((resolve, reject) => {
            Robot.findById(robotId)
                .then((robot: Robot) => {
                    const execsModel = new Execs({
                        robotId: robot.id,
                        dateStart: execs.dateStart
                    });

                    resolve(execsModel.save());
                }, () => reject())
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

    public insertLog(robotDir, execName) {
        return this.readerLogService.readLogBatch(robotDir, execName, (items: String[], stream) => {
            stream && stream.pause();

            let promises = [];
            for (let i = 0; i < items.length; i++) {
                promises.push(this.logMapper(items[i]).save());
            }
            Promise.all(promises).then(() => stream && stream.resume(), (err) => {
                    console.log(err);
                    stream && stream.destroy();
                }
            );
        })
    }

    private logMapper(item) {
        return new Log();
    }

    public endExec(execId: number, execToUpdate: Execs) {
        // let exec: Execs;
        return Promise.all([this.update(execId, execToUpdate)])
            .then((result) => {
                return this.findById(execId);
            })
            // .then((result: Execs) => {
            //     exec = result;
            //     return this.robotService.findById(result.robotId);
            // })
            .then((exec: Execs) => {
                this.insertLog(exec.robot.dir, exec.id);
            })
    }
}
