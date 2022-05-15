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
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    };
    logsOutput: string;

    constructor() {
        Object.assign(this, conf);
    }
}
