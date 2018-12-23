import * as express from 'express';
import * as bodyParser from 'body-parser';
import {Sequelize} from 'sequelize-typescript';
import {Routes} from './routes/robotRoutes';

class RobotApp {

    public app: express.Application;
    public route: Routes;
    public sequelize: Sequelize;

    constructor() {
        this.app = express();
        this.config();
        this.route = new Routes();
        this.route.routes(this.app);
        this.postgresSetup();
    }

    private config(): void {
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
    }

    private postgresSetup(): void {
        var conf = require('../conf.json');
        console.log('conf', conf);
        this.sequelize = new Sequelize({
            name: conf.pg.database,
            dialect: 'postgres',
            host: conf.pg.host,
            port: conf.pg.port,
            username: conf.pg.user,
            password: conf.pg.password,
            modelPaths: [
                __dirname + '/models'
            ]
        });

        this.sequelize.sync({ force: false })
            .then(() => {
                console.log(`Database & tables created!`)
            })
    }
}

export default new RobotApp().app;
