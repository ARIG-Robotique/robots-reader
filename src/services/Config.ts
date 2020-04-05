import { Dialect } from 'sequelize/types';
import { Singleton } from 'typescript-ioc';

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
        const conf = require('../conf.json');
        Object.assign(this, conf);
    }
}
