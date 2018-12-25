import {Robot} from "../models/Robot";
import {Execs} from "../models/Execs";

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
}
