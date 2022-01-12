import { Request, Response } from 'express';
import { Inject } from 'typescript-ioc';
import { BaliseController } from '../controllers/BaliseController';
import { RobotController } from '../controllers/RobotController';
import { Application } from 'express-ws';
import WebSocket from 'ws';
import { WebSocketWrapper } from '../utils/WebSocketWrapper';

export class Routes {
    @Inject
    public robotController: RobotController;
    @Inject
    public baliseController: BaliseController;

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

        app.route('/robot/:idRobot')
            .put((req: Request, res: Response) => {
                return this.robotController.updateRobot(req, res);
            })
            .get((req: Request, res: Response) => {
                return this.robotController.getRobot(req, res);
            })
            .delete((req: Request, res: Response) => {
                return this.robotController.deleteRobot(req, res);
            });

        app.route('/robot/:idRobot/execs')
            .get((req: Request, res: Response) => {
                return this.robotController.getRobotExecs(req, res);
            });

        app.route('/robot/:idRobot/execs/:idExec')
            .delete((req: Request, res: Response) => {
                return this.robotController.deleteRobotExec(req, res);
            });

        app.route('/robot/:idRobot/execs/:idExec/logs')
            .get((req: Request, res: Response) => {
                return this.robotController.getExecLogs(req, res);
            });

        app.route('/robot/:idRobot/execs/:idExec/paths')
            .get((req: Request, res: Response) => {
                return this.robotController.getExecPaths(req, res);
            });

        app.route('/robot/:idRobot/execs/:idExec/paths/:file')
            .get((req: Request, res: Response) => {
                return this.robotController.getExecPathFile(req, res);
            });

        app.route('/robot/:idRobot/copyLogs')
            .get((req: Request, res: Response) => {
                return this.robotController.copyAllLogs(req, res);
            });

        app.route('/robot/:idRobot/importLogs')
            .get((req: Request, res: Response) => {
                return this.robotController.importLogs(req, res);
            });

        app.route('/balise')
            .get((req: Request, res: Response) => {
                return this.baliseController.getAllBalises(req, res);
            })
            .post((req: Request, res: Response) => {
                return this.baliseController.addBalise(req, res);
            });

        app.route('/balise/:idBalise')
            .put((req: Request, res: Response) => {
                return this.baliseController.updateBalise(req, res);
            })
            .get((req: Request, res: Response) => {
                return this.baliseController.getBalise(req, res);
            })
            .delete((req: Request, res: Response) => {
                return this.baliseController.deleteBalise(req, res);
            });

        app.route('/balise/:idBalise/action/:action')
            .put((req: Request, res: Response) => {
                return this.baliseController.doAction(req, res);
            });

        app.route('/health')
            .get((req: Request, res: Response) => {
                res.json({ message: 'Hello world' });
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
