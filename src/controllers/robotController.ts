import {RobotService} from '../services/robotService';
import {Request, Response} from 'express';
import {Robot} from "../models/Robot";

export class RobotController {
    private robotService: RobotService;
    constructor() {
        this.robotService = new RobotService();
    }

    addRobot(req: Request, res: Response): void  {
        let robot = new Robot({
            host: req.body.host,
            name: req.body.name
        });
        console.log('this', this);
        this.robotService.save(robot).then((result) => {
            res.status(201).json(result);
        }, () => {
            res.sendStatus(500);
        });
    }

    updateRobot(req: Request, res: Response): void {
        const id = req.params.id;
        const robot = req.body;

        this.robotService.update(id, robot)
            .then((result) => {
                res.status(201).json(result);
            }, () => {
                res.sendStatus(500);
            })

    }
}
