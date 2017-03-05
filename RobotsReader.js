'use strict';

const fs = require('fs');
const Promise = require('promise');
const glob = Promise.denodeify(require('glob'));
const scp = Promise.denodeify(require('scp2').scp);
const rmdir = Promise.denodeify(require('rmdir'));

const conf = require('./conf.json');
process.env.conf = JSON.stringify(conf);

const postgres = require('./lib/DbPostgres.js');
const influx = require('./lib/DbInflux.js');

const LogReader = require('./lib/LogReader.js');
const TimeseriesReader = require('./lib/TimeseriesReader.js');

/**
 * Retourne la liste des robots enregistrés en base
 * @returns {Promise.<Object[]>}
 */
function listRobots() {
    return postgres.pg.any(`SELECT * FROM robots.robots`);
}

/**
 * Retourne un robot
 * @param {string} idRobot
 * @returns {Promise.<Object>}
 */
function getRobot(idRobot) {
    return postgres.pg.oneOrNone('SELECT * FROM robots.robots WHERE id = $1', [idRobot]);
}

/**
 * Récupère une execution en base
 * @param {string} idExec
 * @returns {Promise.<Object>}
 */
function getExec(idExec) {
    return postgres.pg.oneOrNone(`SELECT * FROM robots.execs WHERE id = $1`, [idExec]);
}

/**
 * Retourne la liste des executions d'un robot
 * @param {string} idRobot
 * @returns {Promise.<Object[]>}
 */
function listRemoteExecs(idRobot) {
    return getRobot(idRobot)
        .then((robot) => {
            if (robot.host) {
                return (fs.existsSync('./temp') ? rmdir('./temp') : Promise.resolve())
                    .then(() => {
                        fs.mkdirSync('./temp');

                        // FIXME ne fonctionne pas
                        return scp({
                            host    : robot.host,
                            username: robot.username,
                            password: robot.password,
                            path    : robot.dir + '/\\*.exec'
                        }, './temp/');
                    })
                    .then(() => {
                        // TODO
                        return [];
                    });
            }
            else {
                return glob('*.exec', {cwd: robot.dir})
                    .then((files) => {
                        return files.map((file) => {
                            return file.replace('.exec', '');
                        });
                    });
            }
        });
}

/**
 * Sauvegarde une execution en base
 * @param {String} idRobot
 * @param {String} idExec
 * @returns {Promise}
 */
function saveExec(idRobot, idExec) {
    return Promise.all([
        getRobot(idRobot),
        getExec(idExec)
    ])
        .then((result) => {
            const [robot, exec] = result;

            if (exec) {
                return Promise.reject('Exec already saved !');
            }

            return LogReader.getStartEnd(robot, idExec)
                .then((dates) => {
                    return insertExec(idExec, robot, dates);
                });
        })
        .then((exec) => {
            return insertTimeseries(robot, exec)
                .then(() => exec);
        })
        .then((exec) => {
            return insertLogs(robot, exec)
                .then(() => exec);
        })
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
    return TimeseriesReader.readTimeseriesBatch(robot, exec.id, (items, stream) => {
        stream && stream.pause();

        influx.writePoints(items.map((item) => {
            return {
                measurement: item.tableName,
                timestamp  : item.time,
                tags       : {idexec: exec.id},
                fields     : item.fields
            };
        }), {
            database : conf.influx.database,
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
    const logsColumns = new postgres.helpers.ColumnSet(['idexec', 'date', 'level', 'thread', 'class', 'message'], {
        table: {
            table : 'logs',
            schema: 'robots'
        }
    });

    return LogReader.readLogBatch(robot, exec.id, (items, stream) => {
        stream && stream.pause();

        const query = pgp.helpers.insert(items, logsColumns);

        postgres.pg.none(query)
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
 * Sauvegarde une execution en base
 * @param {string} idExec
 * @param {object} robot
 * @param {object.<string, moment>} dates
 * @returns {Promise.<object>}
 */
function insertExec(idExec, robot, dates) {
    return postgres.pg.none(`INSERT INTO robots.execs(id, idrobot, datestart, dateend) VALUES($1, $2, $3, $4)`, [
        idExec,
        robot.id,
        dates.start.toDate(),
        dates.end.toDate()
    ])
        .then(() => {
            return getExec(idExec);
        });
}

module.exports = {
    listRobots: listRobots,
    getRobot  : getRobot,

    getExec        : getExec,
    listRemoteExecs: listRemoteExecs,

    saveExec: saveExec
};