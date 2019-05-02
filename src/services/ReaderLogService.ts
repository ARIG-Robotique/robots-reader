import * as path from "path";
import moment = require("moment");
import Promise = require('promise');
import LineByLine = require('line-by-line');

export class ReaderLogService {

    readonly firstLine = Promise.denodeify(require('first-line'));
    readonly lastLine = Promise.denodeify(require('last-line'));

    /**
     * Retourne la date de début et la date de fin pour une execution
     * @param {Object} robot
     * @param {String} exec
     * @returns {Promise.<Object>}
     */
    getStartEnd(robotDir: string, execNum: string) {
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
                }
                else {
                    return Promise.resolve(dates);
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
        console.log(`tracesPath ${tracesPath}`);
        const stream = new LineByLine(tracesPath);
        let current;
        return new Promise((resolve, reject) => {
            stream.on('line', (line) => {
                // vérifie que la ligne commence par une date
                if (line.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
                    if (current) {
                        onData(current, stream);
                    }
                    current = this.parseLog(line);
                    current.idexec = execNum;
                }
                else if (current) {
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
        }
        else {
            console.warn(`Not a log line: ${line}`);
            return null;
        }
    }

    /**
     * Lecture d'un fichier de log en batch de 20 lignes
     * @param {string} exec
     * @param {function} onData appellée pour chaque groupe de 20 lignes de log
     * @returns {Promise}
     */
    readLogBatch(robotDir, execName, onData) {
        let items = [];
        return new Promise((resolve, reject) => {
            this.readLog(robotDir, execName, (item, stream) => {
                console.log(`read log batch  ${JSON.stringify(item)}`);
                items.push(item);
                if (items.length >= 200) {
                    onData(items.slice(0), stream);
                    items.length = 0;
                }
            })
                .then(result => {
                    console.log('readLogBatch finished');
                    resolve(result);
                }, error => reject(error));
        });
    }
}
