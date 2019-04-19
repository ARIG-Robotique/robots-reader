import * as express from 'express';
import * as bodyParser from 'body-parser';
import {Sequelize} from 'sequelize-typescript';
import {Routes} from './routes/Routes';
import * as cors from 'cors';


class App {
    public app: express.Application;
    public route: Routes;
    public sequelize: Sequelize;
    private conf = require('./conf.json');

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
        this.app.use(function (req, res, next) {
            res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
            res.header('Access-Control-Allow-Credentials', 'true');
            next();
        });
    }

    private postgresSetup(): void {
        this.sequelize = new Sequelize({
            name: this.conf.pg.database,
            dialect: this.conf.pg.dialect,
            host: this.conf.pg.host,
            port: this.conf.pg.port,
            username: this.conf.pg.user,
            password: this.conf.pg.password,
            modelPaths: [
                __dirname + '/models'
            ]
            // ],
            // define: {
            //     schema: 'robots'
            // }
        });

        this.syncDb();
    }

    private syncDb() {
        setTimeout(
            () =>
                this.sequelize.sync({force: false})
                    .then(() => {
                        console.log(`Database & tables created!`)
                    }, (e) => {
                        console.error(e);
                        this.syncDb();
                    }),
            5000
        );
    }
}

export default new App().app;
