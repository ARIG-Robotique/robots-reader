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

    findAll(): Promise<Robot[]> {
        return Promise.resolve(Robot.findAll());
    }

    findById(id: number): Promise<Robot> {
        return Promise.resolve(Robot.findByPk(id));
    }

    init() {
        Robot.findAll()
            .then((robots) => {
                const hasNerell = robots.find(r => r.name === 'Nerell' && !r.simulateur);
                const hasNerellSimu = robots.find(r => r.name === 'Nerell' && r.simulateur);
                const hasOdin = robots.find(r => r.name === 'Odin' && !r.simulateur);
                const hasOdinSimu = robots.find(r => r.name === 'Odin' && r.simulateur);

                if (!hasNerell) {
                    new Robot({
                        host      : 'nerell:8080',
                        name      : 'Nerell',
                        simulateur: false,
                    }).save();
                }
                if (!hasNerellSimu) {
                    new Robot({
                        host      : 'localhost:8080',
                        name      : 'Nerell',
                        simulateur: true,
                    }).save();
                }
                if (!hasOdin) {
                    new Robot({
                        host      : 'odin:8081',
                        name      : 'Odin',
                        simulateur: false,
                    }).save();
                }
                if (!hasOdinSimu) {
                    new Robot({
                        host      : 'localhost:8081',
                        name      : 'Odin',
                        simulateur: true,
                    }).save();
                }
            });
    }
}
