import {RobotService} from '../services/RobotService';
import {Request, Response} from 'express';
import {Robot} from '../models/Robot';
import {ExecsService} from '../services/ExecsService';
import {BashService} from '../services/BashService';
import {Inject} from "typescript-ioc";
import {Logger} from "../services/Logger";

export class Controller {
    @Inject
    private robotService: RobotService;
    @Inject
    private execsService: ExecsService;
    @Inject
    private bashService: BashService;
    @Inject
    private log: Logger;

    private handleError(error: Error, res: Response) {
        this.log.error(error);
        res.json(error.message).status(500);
    }

    addRobot(req: Request, res: Response) {
        const robot = new Robot({
            host: req.body.host,
            name: req.body.name,
            dir: req.body.dir,
            simulateur: req.body.simulateur,
            login: req.body.login,
            pwd: req.body.pwd
        });

        this.robotService.save(robot)
            .then(
                (result) => res.status(201).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    updateRobot(req: Request, res: Response) {
        const id = req.params.id;
        const robot = req.body;

        this.robotService.update(id, robot)
            .then(
                (result) => res.status(201).json(result),
                (e: Error) => this.handleError(e, res)
            );

    }

    getAllRobot(req: Request, res: Response) {
        this.robotService.findAll()
            .then(
                (result) => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    getRobot(req: Request, res: Response) {
        this.robotService.findById(req.params.id)
            .then(
                result => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    getRobotFullInfos(req: Request, res: Response) {
        this.robotService.loadRobotFullInfos(req.params.id)
            .then(
                result => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    copyAllLogs(req: Request, res: Response) {
        const robotsId = req.params.id;

        this.bashService.copyAllLog(!Array.isArray(robotsId) ? [robotsId] : robotsId)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }

    importLogs(req: Request, res: Response) {
        const robotId = req.params.id;
        this.execsService.importLogsForRobot(robotId)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }

    deleteRobotExec(req: Request, res: Response) {
        const execId = req.params.id;
        this.execsService.delete(execId)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }

    deleteRobot(req: Request, res: Response) {
        const robotId = req.params.id;
        this.robotService.delete(robotId)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }
}
