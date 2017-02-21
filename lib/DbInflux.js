'use strict';

/**
 * @module
 * @description couche d'accès à la base InfluxDB
 */

const Influx = require('influx');

const conf = require('./conf.json');

const influx = new Influx.InfluxDB(conf.influx);

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

module.exports = influx;
module.exports.init = init;