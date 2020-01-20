import {Request, Response} from 'express';
import {Inject} from 'typescript-ioc';
import {Controller} from '../controllers/Controller';
import {Application} from 'express-ws';
import WebSocket from 'ws';
import {WebSocketWrapper} from '../utils/WebSocketWrapper';

export class Routes {
    @Inject
    public robotController: Controller;

    constructor() {
    }

    routes(app: Application) {
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

        app.route('/robot/:id/execs')
            .get((req: Request, res: Response) => {
                return this.robotController.getRobotExecs(req, res);
            });

        app.route('/exec/:id')
            .delete((req: Request, res: Response) => {
                return this.robotController.deleteRobotExec(req, res);
            });

        app.route('/robot/:id/copyLogs')
            .get((req: Request, res: Response) => {
                return this.robotController.copyAllLogs(req, res);
            });

        app.route('/robot/:id/importLogs')
            .get((req: Request, res: Response) => {
                return this.robotController.importLogs(req, res);
            });

        app.route('/health')
            .get((req: Request, res: Response) => {
                res.json({message: 'Hello world'});
            });

        app.ws('/ws', (ws: WebSocket) => {
            ws.on('message', (msg) => {
                const message = JSON.parse(msg as string);

                if (message.action === 'importLogs') {
                    this.robotController.importLogsStream(message.data, new WebSocketWrapper(ws));
                }
            });
        });
    }
}
