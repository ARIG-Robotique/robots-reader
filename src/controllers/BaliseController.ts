import { Request, Response } from 'express';
import { Inject } from 'typescript-ioc';
import { ExecsDTO } from '../dto/ExecsDTO';
import { Robot } from '../models/Robot';
import { BaliseService } from '../services/BaliseService';
import { BashService } from '../services/BashService';
import { ExecService } from '../services/ExecService';
import { Logger } from '../services/Logger';
import { RobotService } from '../services/RobotService';
import { WebSocketWrapper } from '../utils/WebSocketWrapper';

export class BaliseController {
    @Inject
    private baliseService: BaliseService;
    @Inject
    private robotService: RobotService;
    @Inject
    private log: Logger;

    private handleError(error: Error, res: Response) {
        this.log.error(error);
        res.json(error.message).status(500);
    }

    addBalise(req: Request, res: Response) {
        this.robotService.save({
            ...req.body,
            balise: true,
        })
            .then(
                (result) => res.status(201).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    updateBalise(req: Request, res: Response) {
        this.robotService.update(+req.params.idBalise, req.body)
            .then(
                (result) => res.status(201).json(result),
                (e: Error) => this.handleError(e, res)
            );

    }

    getAllBalises(req: Request, res: Response) {
        this.robotService.findAll(true)
            .then(
                (result) => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    getBalise(req: Request, res: Response) {
        this.robotService.findById(+req.params.idBalise)
            .then(
                result => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    doAction(req: Request, res: Response) {
        this.baliseService.doAction(+req.params.idBalise, req.params.action)
            .then(
                result => res.status(200).json(result),
                (e: Error) => this.handleError(e, res)
            );
    }

    deleteBalise(req: Request, res: Response) {
        const idRobot = +req.params.idBalise;
        this.robotService.delete(idRobot)
            .then(
                () => res.json().status(200),
                (e: Error) => this.handleError(e, res)
            );
    }
}
