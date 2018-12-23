import {Robot} from "../models/Robot";

export class RobotService {
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

}
