import {NextFunction, Request, Response} from 'express';
import {RobotController} from '../controllers/robotController';
import {RobotService} from '../services/robotService';

export class Routes {

    public robotService;
    public robotController;

    constructor() {
        this.robotService = new RobotService();
        this.robotController = new RobotController();
    }

    routes(app) {
        app.route('/robot')

            .get((req: Request, res: Response, next: NextFunction) => {
            })
            .post((req: Request, res: Response) => {
                return this.robotController.addRobot(req, res);
            });
        app.route('/robot/:id')
            .put((req: Request, res: Response) => {
                return this.robotController.updateRobot(req, res);
            });

        app.route('/health')
            .get((req: Request, res: Response) => {
                res.json({message: 'Hello world'});
            });
    }
}
