import {Robot} from '../models/Robot';
import {ExecService} from './ExecService';
import {Inject, Singleton} from 'typescript-ioc';
import {ExecsDTO} from '../dto/ExecsDTO';

@Singleton
export class RobotService {

    private conf = require('../conf.json');

    @Inject
    private execsService: ExecService;

    constructor() {
    }

    save(robot: Robot): Promise<Robot> {
        this.setDir(robot);
        return Promise.resolve(robot.save());
    }

    update(id: number, robot: any): Promise<Robot> {
        return Promise.resolve(Robot.findByPk(id)
            .then(savedRobot => {
                savedRobot.host = robot.host;
                savedRobot.name = robot.name;
                savedRobot.simulateur = robot.simulateur;
                savedRobot.dir = robot.dir;
                savedRobot.login = robot.login;
                savedRobot.pwd = robot.pwd;
                this.setDir(savedRobot);
                return savedRobot.save();
            }));
    }

    private setDir(robot: Robot) {
        if (!robot.simulateur) {
            robot.dir = `${this.conf.logsOutput}/${robot.name}`;
        }
    }

    findAll(): Promise<Robot[]> {
        return Promise.resolve(Robot.findAll());
    }

    findById(id: number): Promise<Robot> {
        return Promise.resolve(Robot.findByPk(id));
    }

    getRobotExecs(idRobot: number): Promise<ExecsDTO[]> {
        return this.execsService.findAllExecsByRobot(idRobot)
            .then((execs) => {
                return execs.map(exec => new ExecsDTO(exec));
            });
    }

    delete(idRobot: number): Promise<void> {
        return Promise.all([
            this.findById(idRobot),
            this.execsService.findAllExecsByRobot(idRobot)
        ])
            .then(([robot, execs]) => {
                const deleteExecs = execs.map(exec => this.execsService.delete(exec.id));
                return Promise.all(deleteExecs)
                    .then(() => robot.destroy())
            });
    }
}
