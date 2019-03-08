import {Robot} from "../models/Robot";
import {ExecsService} from "./ExecsService";
import {Inject} from "typescript-ioc";
import {ExecsDTO} from "../dto/ExecsDTO";
import {RobotDTO} from "../dto/RobotDTO";

export class Service {
    @Inject
    private execsService: ExecsService;

    constructor() {
    }

    public save(robot: Robot) {
        const robotModel = new Robot({host: robot.host, name: robot.name});
        return robotModel.save();
    }

    public update(id: number, robot: Robot) {
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

    public loadRobotFullInfos(id: number) {

        return new Promise((resolve, reject) => {
            Promise.all([this.findById(id), this.execsService.findAllExecsByRobotId(id)])
                .then((result) => {
                    const robot: Robot = result[0];
                    const execs: ExecsDTO[] = result[1];

                    const robotDTO: RobotDTO = new RobotDTO(robot);
                    robotDTO.execs = execs;
                    console.log(JSON.stringify(robotDTO));
                    resolve(robotDTO);
                })
                .catch((error) => reject(error));
        });

    }
}
