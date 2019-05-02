import * as path from "path";
import * as fs from "fs";
import * as firstLine from 'first-line';
import * as lastLine from 'last-line';
import moment = require("moment");
import LineByLineReader = require("line-by-line");

export class ReaderLogService {

    firstLine(path: string) {
        return new Promise((resolve, reject) => {
            firstLine(path, (err, line) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(line);
                }
            });
        });
    }

    lastLine(path: string) {
        return new Promise((resolve, reject) => {
            lastLine(path, (err, line) => {
                if (err) {
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
    getStartEnd(robotDir: string, execNum: string): Promise<{ start: Date, end: Date }> {
        const tracesPath = path.join(robotDir, `${execNum}.exec`);

        return Promise.all([
            this.firstLine(tracesPath),
            this.lastLine(tracesPath)
        ])
            .then((res) => {
                const dates = {
                    start: this.parseLineDate(res[0]),
                    end: this.parseLineDate(res[1])
                };

                if (!dates.start.isValid() || !dates.end.isValid()) {
                    return Promise.reject('Cannot parse dates');
                } else {
                    return Promise.resolve({
                        start: dates.start.toDate(),
                        end: dates.end.toDate(),
                    });
                }
            });
    }

    /**
     * Récupère la date sur une ligne de log
     * @todo meilleure implémentation
     * @param {string} content
     * @returns {moment}
     */
    private parseLineDate(content) {
        return moment(new Date(content.slice(0, 19)));
    }

    /**
     * Lecture d'un fichier de log en stream
     * @param {object} robotDir
     * @param {string} execNum
     * @param {function} onData appellée pour chaque ligne de log
     * @returns {Promise}
     */
    readLog(robotDir: string, execNum: string, onData) {
        console.log(`readlog ${robotDir} ${execNum}`);
        const tracesPath = path.join(robotDir, `${execNum}-traces.log`);

        return new Promise((resolve, reject) => {
            fs.access(tracesPath, (err) => {
                if (err) {
                    console.log('Log file does not exists');
                    resolve();
                }

                const stream = new LineByLineReader(tracesPath);

                let current;
                stream.on('line', (line) => {
                    // vérifie que la ligne commence par une date
                    if (line.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
                        if (current) {
                            onData(current, stream);
                        }
                        current = this.parseLog(line);
                        current.idexec = execNum;
                    } else if (current) {
                        current.message += '\n' + line;
                    }
                });
                stream.on('end', () => {
                    if (current) {
                        onData(current, stream);
                    }
                    console.log('readLog finished');
                    resolve();
                });

                stream.on('error', (error) => reject(error));
            });
        });
    }

    /**
     * Parse une ligne de log CSV
     * @param {string} line
     * @returns {object}
     */
    parseLog(line) {
        let matches = line.match(/^([^;]+);([^;]+);([^;]+);([^;]+);(.*)$/);

        if (matches) {
            return {
                date: moment(matches[1]).toDate(),
                level: matches[2],
                thread: matches[3],
                class: matches[4],
                message: matches[5]
            };
        } else {
            console.warn(`Not a log line: ${line}`);
            return null;
        }
    }

    /**
     * Lecture d'un fichier de log en batch de 20 lignes
     * @param {function} onData appellée pour chaque groupe de 200 lignes de log
     */
    readLogBatch(robotDir: string, execName: string, onData: (items: object[]) => Promise<any>) {
        let items = [];

        return this.readLog(robotDir, execName, (item, stream) => {
            console.log(`read log batch  ${JSON.stringify(item)}`);

            items.push(item);

            if (items.length >= 200) {
                stream.pause();
                onData(items.slice(0))
                    .then(() => {
                        stream.resume();
                    }, (err) => {
                        stream.close();
                        return Promise.reject(err);
                    });
                items.length = 0;
            }
        })
            .then(() => {
                return onData(items);
            });
    }
}
