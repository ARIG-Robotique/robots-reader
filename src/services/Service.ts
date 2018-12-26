import {Robot} from "../models/Robot";
import {Execs} from "../models/Execs";
import {ExecStateEnum} from "../enum/ExecState.enum";

export class Service {
    constructor() {
    }

    public save(robot: Robot) {
        const robotModel = new Robot({host: robot.host, name: robot.name});
        return robotModel.save();
    }

    public update(id, robot: Robot) {
        return Robot.update({
            host: robot.host,
            name: robot.name
        }, {where: {id: id}});
    }

    public findAll() {
        return Robot.findAll();
    }

    public findById(id: number) {
        return Robot.findById(id);
    }

    public createExec(robotId: number, execs: Execs) {
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

    public findExecById(id: number) {
        return Execs.findById(id);
    }

    public updateExec(id, exec: Execs) {
        return Execs.update({
            dateEnd: exec.dateEnd,
            state: ExecStateEnum.DONE
        }, {where: {id: id}});
    }

    public endExec(execId: number, execToUpdate: Execs) {
        return Promise.all([this.updateExec(execId, execToUpdate)])
            .then((result) => {
                return this.findExecById(execId);
            })
            .then(exec => {

            })
    }
}
