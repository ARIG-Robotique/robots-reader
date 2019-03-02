import {Robot} from "../models/Robot";
import {ExecsService} from "./ExecsService";
import {Inject} from "typescript-ioc";

export class Service {
    @Inject
    private execsService: ExecsService;

    constructor() {
        // this.execsService = new ExecsService();
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
        return Robot.findByPrimary(id);
    }
}
