import { Dialect } from 'sequelize/types';
import { Singleton } from 'typescript-ioc';
import conf = require('../conf.json');

@Singleton
export class Config {
    production: boolean;
    pg: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        dialect: Dialect;
    };
    influx: {
        url: string;
        org: string;
        bucket: string;
        token: string;
    };
    logsOutput: string;

    constructor() {
        Object.assign(this, conf);
    }
}
