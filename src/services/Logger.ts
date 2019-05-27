import log4js from 'log4js';
import {Singleton} from "typescript-ioc";

@Singleton
export class Logger {

    private logger;

    constructor() {
        this.logger = log4js.getLogger();
        this.logger.level = 'debug';
    }

    trace(message: any, ...args: any[]): void {
        this.logger.trace(message, ...args);
    }

    debug(message: any, ...args: any[]): void {
        this.logger.debug(message, ...args);
    }

    info(message: any, ...args: any[]): void {
        this.logger.info(message, ...args);
    }

    warn(message: any, ...args: any[]): void {
        this.logger.warn(message, ...args);
    }

    error(message: any, ...args: any[]): void {
        this.logger.error(message, ...args);
    }

    fatal(message: any, ...args: any[]): void {
        this.logger.fatal(message, ...args);
    }

}