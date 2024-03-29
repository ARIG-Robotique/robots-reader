import { Request, Response } from 'express';
import { Inject } from 'typescript-ioc';
import { ExecsDTO } from '../dto/ExecsDTO';
import { BashService } from '../services/BashService';
import { ExecService } from '../services/ExecService';
import { Logger } from '../services/Logger';
import { RobotService } from '../services/RobotService';
import { WebSocketWrapper } from '../utils/WebSocketWrapper';

export class Controller {
    @Inject
    private robotService: RobotService;
    @Inject
    private execsService: ExecService;
    @Inject
    private bashService: BashService;
    @Inject
    private log: Logger;

    private handleError(error: Error, res: Response) {
        this.log.error(error);
        res.json(error.message).status(500);
    }

    getAllRobot(req: Request, res: Response) {
        this.robotService.findAll()
            .then(
                (result) => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    getRobot(req: Request, res: Response) {
        this.robotService.findById(+req.params.idRobot)
            .then(
                result => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    getRobotExecs(req: Request, res: Response) {
        this.execsService.findAllExecsByRobot(+req.params.idRobot)
            .then((execs) => {
                return execs.map(exec => new ExecsDTO(exec));
            })
            .then(
                result => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    copyAllLogs(req: Request, res: Response) {
        this.bashService.copyAllLog(+req.params.idRobot)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }

    importLogs(req: Request, res: Response) {
        this.execsService.importExecsForRobot(+req.params.idRobot)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }

    importLogsStream(req, ws: WebSocketWrapper) {
        const logSubscription = this.log.observable.subscribe(log => {
            ws.send('log', log);
        });

        this.bashService.copyAllLog(+req.idRobot)
            .then(() => this.execsService.importExecsForRobot(+req.idRobot))
            .then(
                () => {
                    logSubscription.unsubscribe();
                    ws.send('importLogsDone');
                },
                (e: Error) => {
                    this.log.error(e);
                    logSubscription.unsubscribe();
                    ws.send('importLogsError');
                }
            );
    }

    deleteRobotExec(req: Request, res: Response) {
        this.execsService.delete(+req.params.idRobot, req.params.idExec)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }

    deleteAllRobotExec(req: Request, res: Response) {
        this.execsService.deleteAll(+req.params.idRobot)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }

    getExecLogs(req: Request, res: Response) {
        this.execsService.getLogs(+req.params.idRobot, req.params.idExec)
            .then(
                result => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    getExecPaths(req: Request, res: Response) {
        this.execsService.getPaths(+req.params.idRobot, req.params.idExec)
            .then(
                result => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    getExecPathFile(req: Request, res: Response) {
        this.execsService.getPathFile(+req.params.idRobot, req.params.idExec, req.params.file)
            .then(
                result => res.sendFile(result, {root: '.'}),
                (e: Error) => this.handleError(e, res)
            );
    }
}
