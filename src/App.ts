import bodyParser from 'body-parser';
import express from 'express';
import expressWs, { Application } from 'express-ws';
import { InfluxDB } from 'influx';
import { find } from 'lodash';
import { Sequelize } from 'sequelize-typescript';
import { Routes } from './routes/Routes';
import { Config } from './services/Config';

class App {
    public app: Application;
    public route: Routes;
    public sequelize: Sequelize;
    private config: Config;

    constructor() {
        this.config = new Config();
        this.app = express() as any;
        this.configure();
        this.route = new Routes();
        this.route.routes(this.app);
        this.postgresSetup();
        this.influxDbSetup();
    }

    private configure(): void {
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use(function (req, res, next) {
            res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
            res.header('Access-Control-Allow-Credentials', 'true');
            next();
        });
        expressWs(this.app);
    }

    private postgresSetup(): void {
        this.sequelize = new Sequelize({
            database  : this.config.pg.database,
            dialect   : this.config.pg.dialect,
            host      : this.config.pg.host,
            port      : this.config.pg.port,
            username  : this.config.pg.user,
            password  : this.config.pg.password,
            modelPaths: [
                __dirname + '/models'
            ],
            logging   : false,
        });

        this.syncDb();
    }

    private syncDb() {
        setTimeout(
            () =>
                this.sequelize.sync({force: false})
                    .then(() => {
                        console.log(`Database & tables created!`)
                    })
                    .catch((e) => {
                        console.error(e);
                        this.syncDb();
                    }),
            5000
        );
    }

    private influxDbSetup(): void {
        setTimeout(
            () => {
                const influx = new InfluxDB(this.config.influx);
                influx.getDatabaseNames()
                    .then((names) => {
                        if (!find(names, this.config.influx.database)) {
                            return influx.createDatabase(this.config.influx.database);
                        }
                    })
                    .catch((e) => {
                        console.error(e);
                        this.influxDbSetup();
                    });
            },
            5000
        );
    }
}

export default new App().app;
