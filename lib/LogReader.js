'use strict';

/**
 * @module
 * @description utilitaire de lecture des fichiers traces.log
 */

const Promise = require('promise');
const path = require('path');
const moment = require('moment');
const fs = require('fs');
const firstLine = Promise.denodeify(require('first-line'));
const lastLine = Promise.denodeify(require('last-line'));
const LineByLine = require('line-by-line');

/**
 * Retourne la date de début et la date de fin pour une execution
 * @param {Object} robot
 * @param {String} exec
 * @returns {Promise.<Object>}
 */
function getStartEnd(robot, exec) {
    const tracesPath = path.join(robot.dir, `${exec}-traces.log`);

    return Promise.all([
        firstLine(tracesPath),
        lastLine(tracesPath)
    ])
        .then((res) => {
            var dates = {
                start: parseLineDate(res[0]),
                end: parseLineDate(res[1])
            };

            if (!dates.start.isValid() || !dates.end.isValid()) {
                return Promise.reject('Cannot parse dates');
            }
            else {
                return dates;
            }
        });
}

/**
 * Récupère la date sur une ligne de log
 * @todo meilleure implémentation
 * @param {string} content
 * @returns {moment}
 */
function parseLineDate(content) {
    return moment(content.slice(0, 19));
}

/**
 * Lecture d'un fichier de log en stream
 * @param {object} robot
 * @param {string} exec
 * @param {function} onData appellée pour chaque ligne de log
 * @returns {Promise}
 */
function readLog(robot, exec, onData) {
    return new Promise((resolve, reject) => {
        const tracesPath = path.join(robot.dir, `${exec}-traces.log`);
        const stream = new LineByLine(tracesPath);

        let current;

        stream.on('line', (line) => {
            // vérifie que la ligne commence par une date
            if (line.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
                if (current) {
                    onData(current, stream);
                }
                current = parseLog(line);
                current.idexec = exec;
            }
            else if (current) {
                current.message += '\n' + line;
            }
        });

        stream.on('end', () => {
            if (current) {
                onData(current, stream);
            }
            resolve();
        });

        stream.on('error', reject);
    });
}

/**
 * Parse une ligne de log CSV
 * @param {string} line
 * @returns {object}
 */
function parseLog(line) {
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
 * @param {object} robot
 * @param {string} exec
 * @param {function} onData appellée pour chaque groupe de 20 lignes de log
 * @returns {Promise}
 */
function readLogBatch(robot, exec, onData) {
    let items = [];

    return readLog(robot, exec, (item, stream) => {
        items.push(item);

        if (items.length >= 20) {
            onData(items.slice(0), stream);
            items.length = 0;
        }
    })
        .then(() => {
            if (items.length > 0) {
                onData(items);
            }
        });
}

module.exports = {
    getStartEnd: getStartEnd,

    readLog: readLog,
    readLogBatch: readLogBatch
};