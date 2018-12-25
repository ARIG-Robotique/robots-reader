import {Request, Response} from 'express';
import {Controller} from '../controllers/Controller';
import {Service} from '../services/Service';

export class Routes {

    public robotService;
    public robotController;

    constructor() {
        this.robotService = new Service();
        this.robotController = new Controller();
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
                return this.robotController.createExec(req, res);
            });

        app.route('/health')
            .get((req: Request, res: Response) => {
                res.json({message: 'Hello world'});
            });
    }
}
