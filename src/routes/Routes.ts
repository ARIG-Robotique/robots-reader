import {Request, Response} from 'express';
import {Inject} from "typescript-ioc";
import {RobotsService} from "../../../robots-supervisor/src/app/services/robots.service";
import {Controller} from "../controllers/Controller";

export class Routes {
    @Inject
    public robotService : RobotsService;
    @Inject
    public robotController : Controller;

    constructor() {
        // this.robotService = new RobotsService();

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
            });

        app.route('/robot/:id/execs')
            .post((req: Request, res: Response) => {
                return this.robotController.readAnExec(req, res);
            });

        app.route('/health')
            .get((req: Request, res: Response) => {
                res.json({message: 'Hello world'});
            });
    }
}
