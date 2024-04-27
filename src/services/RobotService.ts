import { Cacheable } from 'typescript-cacheable';
import { Inject, Singleton } from 'typescript-ioc';
import { Robot } from '../models/Robot';
import { Config } from './Config';
import { Logger } from './Logger';

@Singleton
export class RobotService {

    @Inject
    private config: Config;

    @Inject
    private log: Logger;

    buildDir(robot: Robot): string {
        if (robot.simulateur) {
            return `${this.config.logsOutput}-simulateur/${robot.name.toLowerCase()}`;
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
                const hasNerell = robots.find(r => r.name === 'Nerell' && !r.simulateur) !== undefined;
                const hasNerellSimu = robots.find(r => r.name === 'Nerell' && r.simulateur) !== undefined;
                const hasOdin = robots.find(r => r.name === 'Odin' && !r.simulateur) !== undefined;
                const hasOdinSimu = robots.find(r => r.name === 'Odin' && r.simulateur) !== undefined;
                const hasPamiTriangle = robots.find(r => r.name === 'Pami △' && !r.simulateur) !== undefined;
                const hasPamiTriangleSimu = robots.find(r => r.name === 'Pami △' && r.simulateur) !== undefined;
                const hasPamiCarre = robots.find(r => r.name === 'Pami ▢' && !r.simulateur) !== undefined;
                const hasPamiCarreSimu = robots.find(r => r.name === 'Pami ▢' && r.simulateur) !== undefined;
                const hasPamiRond = robots.find(r => r.name === 'Pami ○' && !r.simulateur) !== undefined;
                const hasPamiRondSimu = robots.find(r => r.name === 'Pami ○' && r.simulateur) !== undefined;

                this.log.info(`Nerell found             : ${hasNerell}`)
                this.log.info(`Nerell simu found        : ${hasNerellSimu}`)
                this.log.info(`Odin found               : ${hasOdin}`)
                this.log.info(`Odin simu found          : ${hasOdinSimu}`)
                this.log.info(`Pami Triangle found      : ${hasPamiTriangle}`)
                this.log.info(`Pami Triangle simu found : ${hasPamiTriangleSimu}`)
                this.log.info(`Pami Carre found         : ${hasPamiCarre}`)
                this.log.info(`Pami Carre simu found    : ${hasPamiCarreSimu}`)
                this.log.info(`Pami Rond found          : ${hasPamiRond}`)
                this.log.info(`Pami Rond simu found     : ${hasPamiRondSimu}`)

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
                /*if (!hasOdin) {
                    new Robot({
                        host      : 'odin:8080',
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
                }*/
                if (!hasPamiTriangle) {
                    new Robot({
                        host      : 'pami-triangle:8080',
                        name      : 'Pami △',
                        simulateur: false,
                    }).save();
                }
                if (!hasPamiTriangleSimu) {
                    new Robot({
                        host      : 'localhost:8082',
                        name      : 'Pami △',
                        simulateur: true,
                    }).save();
                }
                if (!hasPamiCarre) {
                    new Robot({
                        host      : 'pami-carre:8080',
                        name      : 'Pami ▢',
                        simulateur: false,
                    }).save();
                }
                if (!hasPamiCarreSimu) {
                    new Robot({
                        host      : 'localhost:8083',
                        name      : 'Pami ▢',
                        simulateur: true,
                    }).save();
                }
                if (!hasPamiRond) {
                    new Robot({
                        host      : 'pami-rond:8080',
                        name      : 'Pami ○',
                        simulateur: false,
                    }).save();
                }
                if (!hasPamiRondSimu) {
                    new Robot({
                        host      : 'localhost:8084',
                        name      : 'Pami ○',
                        simulateur: true,
                    }).save();
                }
            });
    }
}
