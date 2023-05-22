import bodyParser from 'body-parser';
import express from 'express';
import expressWs, { Application } from 'express-ws';
import { InfluxDB, HttpError } from '@influxdata/influxdb-client';
import { OrgsAPI, BucketsAPI } from '@influxdata/influxdb-client-apis';
import { Sequelize } from 'sequelize-typescript';
import { Routes } from './routes/Routes';
import { Config } from './services/Config';
import { RobotService } from './services/RobotService';

class App {
    public app: Application;
    private sequelize: Sequelize;
    private config: Config;
    private robotService: RobotService;

    constructor() {
        this.config = new Config();
        this.robotService = new RobotService();
        this.app = expressWs(express()).app;
        this.configure();
        new Routes().configure(this.app);
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
                        console.log(`PostgreSQL database & tables created !`);
                        this.robotService.init();
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
            async () => {
                const url = this.config.influx.url;
                const org = this.config.influx.org;
                const bucket = this.config.influx.bucket;
                const token = this.config.influx.token;

                const influx = new InfluxDB({url, token});

                const orgsAPI = new OrgsAPI(influx);
                const organizations = await orgsAPI.getOrgs({org});
                const orgID = organizations.orgs[0].id;

                const bucketsAPI = new BucketsAPI(influx);
                try {
                  const buckets = await bucketsAPI.getBuckets({orgID, name: bucket})
                  if (buckets && buckets.buckets && buckets.buckets.length) {
                    const bucketID = buckets.buckets[0].id
                      console.log(`Bucket named "${this.config.influx.bucket}" (#${bucketID}) exist"`)
                  }
                } catch (e) {
                  if (e instanceof HttpError && e.statusCode == 404) {
                    // OK, bucket not found
                    console.log(`Bucket named "${this.config.influx.bucket}" not exist"`)
                    console.error(e);
                    this.influxDbSetup();
                  } else {
                    throw e
                  }
                }
            },
            5000
        );
    }
}

export default new App().app;
