import log4js, {AppenderModule, LoggingEvent} from 'log4js';
import {Singleton} from 'typescript-ioc';
import {Subject} from 'rxjs';

export interface LogItem {
    level: string;
    time: Date;
    message: string;
}

@Singleton
export class Logger {

    private logger;

    public observable = new Subject<LogItem>();

    constructor() {
        const observableAppender: AppenderModule = {
            configure: (config, layouts) => (event: LoggingEvent) => {
                this.observable.next({
                    level  : event.level.levelStr,
                    time   : event.startTime,
                    message: layouts.messagePassThroughLayout(event),
                });
            }
        };

        log4js.configure({
            appenders : {
                out       : {type: 'stdout'},
                observable: {type: observableAppender},
            },
            categories: {
                default: {appenders: ['out', 'observable'], level: 'debug'}
            }
        });

        this.logger = log4js.getLogger();
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
