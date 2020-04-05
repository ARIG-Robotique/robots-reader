import { Cacheable, globalSet as cacheSet } from 'typescript-cacheable';
import { Inject, Singleton } from 'typescript-ioc';
import { Robot } from '../models/Robot';
import { Config } from './Config';

@Singleton
export class RobotService {

    @Inject
    private config: Config;

    constructor() {
    }

    save(robot: Robot): Promise<Robot> {
        return Promise.resolve(robot.save());
    }

    update(id: number, robot: Robot): Promise<Robot> {
        return Promise.resolve(Robot.findByPk(id)
            .then(savedRobot => {
                savedRobot.host = robot.host;
                savedRobot.name = robot.name;
                savedRobot.simulateur = robot.simulateur;
                savedRobot.login = robot.login;
                savedRobot.pwd = robot.pwd;
                return savedRobot.save();
            }))
            .then(robot => {
                robot.dir = this.buildDir(robot);
                cacheSet(this, 'getDir', [id], robot.dir);
                return robot;
            });
    }

    private buildDir(robot: Robot): string {
        if (robot.simulateur) {
            return `${this.config.logsOutput}/simulateur`; // volume docker ou lien symbolique
        } else {
            return `${this.config.logsOutput}/${robot.id}`;
        }
    }

    @Cacheable() // mis en cache car appellé pour chaque image de path
    async getDir(idRobot: number): Promise<string> {
        return this.findById(idRobot)
            .then(robot => robot.dir);
    }

    findAll(): Promise<Robot[]> {
        return Promise.resolve(Robot.findAll());
    }

    findById(id: number): Promise<Robot> {
        return Promise.resolve(Robot.findByPk(id))
            .then(robot => {
                robot.dir = this.buildDir(robot);
                cacheSet(this, 'getDir', [id], robot.dir);
                return robot;
            });
    }

    delete(idRobot: number): Promise<void> {
        return Promise.resolve(Robot.findByPk(idRobot))
            .then((robot) => robot.destroy());
    }
}
