import { isValid, parseISO } from 'date-fns';
import firstLine from 'first-line';
import fs from 'fs';
import lastLine from 'last-line';
import readline, { Interface } from 'readline';
import { Inject, Singleton } from 'typescript-ioc';
import { LogDTO } from '../dto/LogDTO';
import { Exec } from '../models/Exec';
import { Logger } from './Logger';

@Singleton
export class ReaderLogService {

    @Inject
    private log: Logger;

    // NB: first-line renvoie un buffer, last-line renvoie une string
    // les joies des micro packages

    firstLine(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            firstLine(path, (err: Error, line) => {
                if (err) {
                    this.log.error(`Error while reading first line ${err.stack}`);
                    reject(err);
                } else {
                    resolve(line.toString());
                }
            });
        });
    }

    lastLine(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            lastLine(path, (err: Error, line) => {
                if (err) {
                    this.log.error(`Error while reading last line ${err.message}`);
                    reject(err);
                } else {
                    resolve(line);
                }
            });
        });
    }

    /**
     * Retourne la date de début et la date de fin pour une execution
     */
    getStartEnd(robotDir: string, idExec: string): Promise<{ start: Date, end: Date }> {
        return new Promise<{ start: Date, end: Date }>((resolve, reject) => {
            const tracesPath = Exec.execFile(robotDir, idExec);
            return Promise.all([
                this.firstLine(tracesPath),
                this.lastLine(tracesPath)
            ])
                .then((res) => {
                    const dates = {
                        start: this.parseLineDate(res[0]),
                        end  : this.parseLineDate(res[1])
                    };

                    if (!isValid(dates.start) || !isValid(dates.end)) {
                        reject('Cannot parse dates');
                    } else {
                        resolve({
                            start: dates.start,
                            end  : dates.end,
                        });
                    }
                }, reject);
        });
    }

    /**
     * Récupère la date sur une ligne de log
     */
    private parseLineDate(content: string): Date {
        return parseISO(content.slice(0, 19));
    }

    /**
     * Lecture d'un fichier de log en batch de 200 lignes
     */
    readLogBatch(robotDir: string, idExec: string, onData: (items: LogDTO[]) => Promise<unknown>): Promise<void> {
        let items: LogDTO[] = [];

        return this.readLog(robotDir, idExec, (item, stream) => {
            items.push(item);

            if (items.length >= 200) {
                stream.pause();

                onData(items.slice(0))
                    .then(() => {
                        stream.resume();
                    }, (err: Error) => {
                        items.length = 0;
                        stream.close();
                        this.log.error(`Error while processing log ${robotDir} ${idExec} with error : ${err.stack}`);
                    });

                items.length = 0;
            }
        })
            .then(() => onData(items))
            .then(() => null);
    }

    /**
     * Lecture d'un fichier de log en stream
     */
    private readLog(robotDir: string, idExec: string, onData: (content: LogDTO, stream: Interface) => void): Promise<void> {
        this.log.info(`readlog ${robotDir} ${idExec}`);
        const tracesPath = Exec.tracesFile(robotDir, idExec);

        return new Promise((resolve, reject) => {
            fs.access(tracesPath, (err) => {
                if (err) {
                    this.log.warn('Log file does not exist');
                    resolve();
                    return;
                }

                const fileStream = fs.createReadStream(tracesPath);
                const lineStream = readline.createInterface({
                    input: fileStream,
                });

                let current: LogDTO;
                lineStream.on('line', (line) => {
                    // vérifie que la ligne commence par une date
                    if (line.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
                        if (current) {
                            onData(current, lineStream);
                        }
                        current = this.parseLog(line);
                    } else if (current) {
                        current.message += '\n' + line;
                    }
                });

                lineStream.on('close', () => {
                    if (current) {
                        onData(current, lineStream);
                    }
                    this.log.info('readLog finished');
                    resolve();
                });

                fileStream.on('error', (error: Error) => {
                    this.log.error(`Error while reading log ${tracesPath} with error : ${error.stack}`);
                    resolve();
                });
            });
        });
    }

    /**
     * Parse une ligne de log CSV
     */
    private parseLog(line: string): LogDTO {
        let matches = line.match(/^([^;]+);([^;]+);([^;]+);([^;]+);(.*)$/);

        if (matches) {
            return {
                date   : parseISO(matches[1]),
                level  : matches[2],
                thread : matches[3],
                clazz  : matches[4],
                message: matches[5]
            };
        } else {
            this.log.warn(`Not a log line: ${line}`);
            return null;
        }
    }
}
