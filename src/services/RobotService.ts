import {Robot} from '../models/Robot';
import {ExecsService} from './ExecsService';
import {Inject, Singleton} from 'typescript-ioc';
import {ExecsDTO} from '../dto/ExecsDTO';
import {RobotDTO} from '../dto/RobotDTO';

@Singleton
export class RobotService {

    private conf = require('../conf.json');

    @Inject
    private execsService: ExecsService;

    constructor() {
    }

    public save(robot: Robot): Promise<Robot> {
        this.setDir(robot);
        return Promise.resolve(robot.save());
    }

    public update(id: number, robot: Robot): Promise<[number, Robot[]]> {
        this.setDir(robot);
        return Promise.resolve(Robot.update({
            host: robot.host,
            name: robot.name,
            simulateur: robot.simulateur,
            dir: robot.dir,
            login: robot.login,
            pwd: robot.pwd
        }, {where: {id: id}}));
    }

    private setDir(robot: Robot) {
        if (!robot.simulateur) {
            robot.dir = `${this.conf.logsOutput}/${robot.name}`;
        }
    }

    public findAll(): Promise<Robot[]> {
        return Promise.resolve(Robot.findAll());
    }

    public findById(id: number): Promise<Robot> {
        return Promise.resolve(Robot.findByPk(id));
    }

    public loadRobotFullInfos(robotId: number): Promise<RobotDTO> {
        return Promise.all([
            this.findById(robotId),
            this.execsService.findAllExecsByRobotId(robotId)
        ])
            .then(([robot, execs]) => {
                const robotDTO = new RobotDTO(robot);
                robotDTO.execs = execs.map(exec => new ExecsDTO(exec));
                return robotDTO;
            });
    }

    public delete(robotId: number): Promise<void> {
        return Promise.all([
            this.findById(robotId),
            this.execsService.findAllExecsByRobotId(robotId)
        ])
            .then(([robot, execs]) => {
                const deleteExecs = execs.map(exec => this.execsService.delete(exec.id));
                return Promise.all(deleteExecs)
                    .then(() => robot.destroy())
            });
    }
}
