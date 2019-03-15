import {Robot} from "../models/Robot";
import {ExecsService} from "./ExecsService";
import {Inject} from "typescript-ioc";
import {ExecsDTO} from "../dto/ExecsDTO";
import {RobotDTO} from "../dto/RobotDTO";
import {Execs} from "../models/Execs";

export class Service {
    @Inject
    private execsService: ExecsService;

    constructor() {
    }

    public save(robot: Robot) {
        return robot.save();
    }

    public update(id: number, robot: Robot) {
        return Robot.update({
            host: robot.host,
            name: robot.name,
            simulateur: robot.simulateur,
            dir: robot.dir
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
                    const execs: Execs[] = result[1];

                    const robotDTO: RobotDTO = new RobotDTO(robot);
                    robotDTO.execs = execs.map(exec => new ExecsDTO(exec));

                    resolve(robotDTO);
                })
                .catch((error) => reject(error));
        });
    }

    public delete(robotId: number) {
        return Promise.all([Robot.findByPrimary(robotId), this.execsService.findAllExecsByRobotId(robotId)])
            .then(result => {
                const robot: Robot = result[0];
                const execs: Execs[] = result[1];
                const promise = [];
                execs.forEach(exec => promise.push(this.execsService.delete(exec.id)));
                return Promise.all(promise)
                    .then(res => {
                        return robot.destroy();
                    })
            });
    }
}
