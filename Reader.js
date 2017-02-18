'use strict';

const Promise = require('promise');
const pgp = require('pg-promise')();
const Influx = require('influx');
const fs = require('fs');
const glob = Promise.denodeify(require('glob'));
const scp = Promise.denodeify(require('scp2').scp);
const rmdir = Promise.denodeify(require('rmdir'));
const _ = require('lodash');

const conf = require('./conf.json');
const LogReader = require('./LogReader.js');

const postgres = pgp(conf.pg);
const influx = new Influx.InfluxDB(conf.influx);

const PRECISION_MAP = {
    'NANOSECONDS': 'ns',
    'MICROECONDS': 'u',
    'MILLISECONDS': 'ms',
    'SECONDS': 's',
    'MINUTES': 'm',
    'HOURS': 'h'
};

/**
 * Initialise le reader
 * @returns {Promise}
 */
function init() {
    return influx.getDatabaseNames()
        .then((names) => {
            if (!_.find(names, conf.influx.database)) {
                return influx.createDatabase(conf.influx.database);
            }
            else {
                return Promise.resolve();
            }
        })
}

/**
 * Ferme le reader
 */
function close() {
    postgres.end();
}

/**
 * Retourn une robot
 * @param robotId
 * @returns {Promise.<Object>}
 */
function getRobot(robotId) {
    return postgres.oneOrNone('SELECT * FROM robots.robots WHERE id = $1', [robotId]);
}

/**
 * Retourne la liste des robots enregistrés en base
 * @returns {Promise.<Object>}
 */
function listRobots() {
    console.log('List registered robots');

    return postgres.any(`SELECT * FROM robots.robots`);
}

/**
 * Retourne la liste des executions pour un robot
 * @param {Object} robot
 * @returns {Promise.<String[]>}
 */
function listExec(robot) {
    console.log(`List exec for ${robot.id}: ${robot.host || ''}${robot.dir}`);

    if (robot.host) {
        return (fs.existsSync('./temp') ? rmdir('./temp') : Promise.resolve())
            .then(() => {
                fs.mkdirSync('./temp');

                return scp({
                    host: robot.host,
                    username: robot.username,
                    password: robot.password,
                    path: robot.dir + '/\\*.exec'
                }, './temp/');
            });
    }
    else {
        return glob('*.exec', {cwd: robot.dir})
            .then((files) => {
                return _.map(files, (file) => {
                    return file.replace('.exec', '');
                });
            });
    }
}

/**
 * Sauvegarde une execution en base
 * @param {Object} robot
 * @param {String} execId
 * @returns {Promise}
 */
function saveExec(robot, execId) {
    console.log(`Register exec ${execId} for ${robot.id}`);

    return getExec(execId)
        .then((exec) => {
            if (exec) {
                // TODO return Promise.reject('Exec already saved !');
                return exec;
            }

            return LogReader.getStartEnd(robot, execId)
                .then((dates) => {
                    return insertExec(execId, robot, dates);
                });
        })
        .then((exec) => {
            return insertTimeseries(robot, exec)
                .then(() => exec);
        })
        /*.then((exec) => {
         return insertLogs(robot, exec)
         .then(() => exec);
         })*/
        .then((exec) => {
            console.log('end', exec);
        });
}

/**
 * Sauvegarde les timeseries dans influxdb
 * @param {object} robot
 * @param {object} exec
 * @returns {Promise}
 */
function insertTimeseries(robot, exec) {
    return LogReader.readTimeseriesBatch(robot, exec.id, (items, stream) => {
        stream && stream.pause();

        influx.writePoints(_.map(items, (item) => {
            return {
                measurement: item.tableName,
                timestamp: item.time,
                tags: {idexec: exec.id},
                fields: item.fields
            };
        }), {
            database: conf.influx.database,
            precision: 'ms'
        })
            .then(() => {
                stream && stream.resume();
            })
            .catch((err) => {
                console.error(err);
                stream && stream.destroy();
            });
    });
}

/**
 * Insertion des logs dans la base postgres
 * @param {object} robot
 * @param {object} exec
 * @returns {Promise}
 */
function insertLogs(robot, exec) {
    const logsColumns = new pgp.helpers.ColumnSet(['idexec', 'date', 'level', 'thread', 'class', 'message'], {
        table: {
            table: 'logs',
            schema: 'robots'
        }
    });

    return LogReader.readLogBatch(robot, exec.id, (items, stream) => {
        stream && stream.pause();

        const query = pgp.helpers.insert(items, logsColumns);

        postgres.none(query)
            .then(() => {
                stream && stream.resume();
            })
            .catch((err) => {
                console.log(err);
                stream && stream.destroy();
            });
    });
}

/**
 * Récupère une execution en base
 * @param exec
 * @returns {Promise.<Object>}
 */
function getExec(exec) {
    console.log(`Query exec ${exec}`);

    return postgres.oneOrNone(`SELECT * FROM robots.execs WHERE id = $1`, [exec]);
}

/**
 * Sauvegarde uen execution en base
 * @param {string} execId
 * @param {object} robot
 * @param {object.<string, moment>} dates
 * @returns {Promise.<object>}
 */
function insertExec(execId, robot, dates) {
    console.log(`Insert exec ${JSON.stringify(arguments)}`);

    return postgres.none(`INSERT INTO robots.execs(id, idrobot, datestart, dateend) VALUES($1, $2, $3, $4)`, [
        execId,
        robot.id,
        dates.start.toDate(),
        dates.end.toDate()
    ])
        .then(() => {
            return getExec(execId);
        });
}

module.exports = {
    init: init,
    close: close,

    getRobot: getRobot,
    listRobots: listRobots,

    listExec: listExec,
    saveExec: saveExec
};