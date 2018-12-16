import {Request, Response} from 'express';

export class Routes {

    routes(app) {
        app.route('/robot')
            .get((req: Request, res: Response) => {

            })
            .post((req: Request, res: Response) => {

            })
    }
}
