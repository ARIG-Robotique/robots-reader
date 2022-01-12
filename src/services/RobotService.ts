import { Sequelize } from 'sequelize';
import { Cacheable } from 'typescript-cacheable';
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
        return Promise.resolve(new Robot({
            host      : robot.host,
            name      : robot.name,
            simulateur: robot.simulateur,
            login     : robot.login,
            pwd       : robot.pwd
        }).save());
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
            }));
    }

    buildDir(robot: Robot): string {
        if (robot.simulateur) {
            return `${this.config.logsOutput}/simulateur-${robot.name.toLowerCase()}`; // volume docker ou lien symbolique
        } else {
            return `${this.config.logsOutput}/${robot.name.toLowerCase()}`;
        }
    }

    @Cacheable() // mis en cache car appellé pour chaque image de path
    async getDir(idRobot: number): Promise<string> {
        return this.findById(idRobot)
            .then(robot => this.buildDir(robot));
    }

    findAll(balise: boolean): Promise<Robot[]> {
        return Promise.resolve(Robot.findAll({
            where: Sequelize.and({ balise }),
        }));
    }

    findById(id: number): Promise<Robot> {
        return Promise.resolve(Robot.findByPk(id));
    }

    delete(idRobot: number): Promise<void> {
        return Promise.resolve(Robot.findByPk(idRobot))
            .then((robot) => robot.destroy());
    }
}
