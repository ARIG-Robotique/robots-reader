import {Service} from '../services/Service';
import {Request, Response} from 'express';
import {Robot} from "../models/Robot";
import {ExecsService} from "../services/ExecsService";
import {BashService} from "../services/BashService";

export class Controller {
    private robotService: Service;
    private execsService: ExecsService;
    private bashService: BashService;

    constructor() {
        this.robotService = new Service();
        this.execsService = new ExecsService();
        this.bashService = new BashService();
    }

    addRobot(req: Request, res: Response) {
        let robot = new Robot({
            host: req.body.host,
            name: req.body.name
        });
        console.log('robot to be added', robot);

        console.log('this', this);
        this.robotService.save(robot).then((result) => {
            res.status(201).json(result);
        }, () => {
            res.sendStatus(500);
        });
    }

    updateRobot(req: Request, res: Response) {
        const id = req.params.id;
        const robot = req.body;

        this.robotService.update(id, robot)
            .then((result) => {
                res.status(201).json(result);
            }, () => {
                res.sendStatus(500);
            })

    }

    getAllRobot(req: Request, res: Response) {
        this.robotService.findAll()
            .then((result) => {
                res.status(200).json(result);
            }, () => res.status(500));
    }

    getRobot(req: Request, res: Response) {
        this.robotService.findById(req.params.id)
            .then(result => res.status(200).json(result),
                () => res.status(404));
    }

    getRobotFullInfos(req: Request, res: Response) {
        this.robotService.loadRobotFullInfos(req.params.id)
            .then(result => res.status(200).json(result),
                () => res.status(500));
    }

    readAnExec(req: Request, res: Response) {
        const execs = req.body;
        const robotId = req.params.id;
        console.log(`Read an execs for Robot ${robotId}`, execs);
        this.execsService.loadLog(robotId, execs)
            .then(result => res.status(200).json(result),
                (error) => res.status(500).json(error));
    }

    copyAllLogs(req: Request, res: Response) {
        const robotsId = req.query.ids;

        this.bashService.copyAllLog(!Array.isArray(robotsId) ? [robotsId] : robotsId)
            .then(() => res.status(200),
                () => res.status(500));

    }
}
