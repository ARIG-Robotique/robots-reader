import {RobotService} from '../services/RobotService';
import {Request, Response} from 'express';
import {Robot} from '../models/Robot';
import {ExecsService} from '../services/ExecsService';
import {BashService} from '../services/BashService';

export class Controller {
    private robotService: RobotService;
    private execsService: ExecsService;
    private bashService: BashService;

    constructor() {
        this.robotService = new RobotService();
        this.execsService = new ExecsService();
        this.bashService = new BashService();
    }

    addRobot(req: Request, res: Response) {
        let robot = new Robot({
            host: req.body.host,
            name: req.body.name,
            dir: req.body.dir,
            simulateur: req.body.simulateur
        });

        this.robotService.save(robot)
            .then((result) => {
                res.status(201).json(result);
            }, (e: Error) => {
                console.error(e);
                res.json(e.message).status(500);
            });
    }

    updateRobot(req: Request, res: Response) {
        const id = req.params.id;
        const robot = req.body;

        this.robotService.update(id, robot)
            .then((result) => {
                res.status(201).json(result);
            }, (error: Error) => {
                res.json(error.message).status(500);
            })

    }

    getAllRobot(req: Request, res: Response) {
        this.robotService.findAll()
            .then((result) => {
                res.status(200).json(result);
            }, (error: Error) => res.json(error.message).status(500));
    }

    getRobot(req: Request, res: Response) {
        this.robotService.findById(req.params.id)
            .then(result => res.status(200).json(result),
                () => res.sendStatus(404));
    }

    getRobotFullInfos(req: Request, res: Response) {
        this.robotService.loadRobotFullInfos(req.params.id)
            .then(result => res.status(200).json(result),
                (error: Error) => res.json(error.message).status(500));
    }

    copyAllLogs(req: Request, res: Response) {
        const robotsId = req.params.id;

        this.bashService.copyAllLog(!Array.isArray(robotsId) ? [robotsId] : robotsId)
            .then(() => res.json().status(200),
                (error: Error) => res.json(error).status(500));
    }

    importLogs(req: Request, res: Response) {
        const robotId = req.params.id;
        this.execsService.importLogsForRobot(robotId)
            .then(() => res.json().status(200),
                (error: Error) => res.json(error).status(500));
    }

    deleteRobotExec(req: Request, res: Response) {
        const execId = req.params.id;
        this.execsService.delete(execId)
            .then(() => res.json().status(200),
                (error: Error) => res.json(error.message).status(500))
    }

    deleteRobot(req: Request, res: Response) {
        const robotId = req.params.id;
        this.robotService.delete(robotId)
            .then(() => res.json().status(200),
                (err: Error) => res.json(err.message).status(500));
    }
}
