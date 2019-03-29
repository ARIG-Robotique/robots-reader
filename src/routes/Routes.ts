import {Request, Response} from 'express';
import {Inject} from "typescript-ioc";
import {RobotsService} from "../../../robots-supervisor/src/app/services/robots.service";
import {Controller} from "../controllers/Controller";

export class Routes {
    @Inject
    public robotService: RobotsService;
    @Inject
    public robotController: Controller;

    constructor() {
    }

    routes(app) {
        app.route('/robot')
            .get((req: Request, res: Response) => {
                return this.robotController.getAllRobot(req, res);
            })
            .post((req: Request, res: Response) => {
                return this.robotController.addRobot(req, res);
            });

        app.route('/robot/:id')
            .put((req: Request, res: Response) => {
                return this.robotController.updateRobot(req, res);
            })
            .get((req: Request, res: Response) => {
                return this.robotController.getRobot(req, res);
            })
            .delete((req: Request, res: Response) => {
                return this.robotController.deleteRobot(req, res);
            });

        app.route('/robot/:id/full')
            .get((req: Request, res: Response) => {
                return this.robotController.getRobotFullInfos(req, res);
            });

        app.route('/robot/:id/copyLogs')
            .get((req: Request, res: Response) => {
                return this.robotController.copyAllLogs(req, res);
            });

        app.route('/exec/:id')
            .delete((req: Request, res: Response) => {
                return this.robotController.deleteRobotExec(req, res);
            });

        app.route('/robot/:id/importLogs')
            .get((req: Request, res: Response) => {
                return this.robotController.importLogs(req, res);
            });

        app.route('/health')
            .get((req: Request, res: Response) => {
                res.json({message: 'Hello world'});
            });
    }
}
