import * as express from 'express';
import * as bodyParser from 'body-parser';
import {Sequelize} from 'sequelize-typescript';
import {Routes} from './routes/Routes';
import * as _ from 'lodash';
import {InfluxDB} from "influx";

declare let influx: InfluxDB;

class App {

    public app: express.Application;
    public route: Routes;
    public sequelize: Sequelize;
    private conf = require('../conf.json');

    constructor() {
        this.app = express();
        this.config();
        this.route = new Routes();
        this.route.routes(this.app);
        this.postgresSetup();
        this.influxDbSetup();
    }

    private config(): void {
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
    }

    private postgresSetup(): void {
        this.sequelize = new Sequelize({
            name: this.conf.pg.database,
            dialect: 'postgres',
            host: this.conf.pg.host,
            port: this.conf.pg.port,
            username: this.conf.pg.user,
            password: this.conf.pg.password,
            modelPaths: [
                __dirname + '/models'
            ]
        });

        this.sequelize.sync({force: false})
            .then(() => {
                console.log(`Database & tables created!`)
            })
    }

    private influxDbSetup(): void {
        influx = new InfluxDB(this.conf.influx);
        influx.getDatabaseNames()
            .then((names) => {
                if (!_.find(names, this.conf.influx.database)) {
                    return influx.createDatabase(this.conf.influx.database);
                }
                else {
                    return Promise.resolve();
                }
            });
    }
}

export default new App().app;
