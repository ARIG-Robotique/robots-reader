'use strict';

/**
 * @module
 * @description couche d'accès à la base PostgreSQL
 */

const pgp = require('pg-promise')();

const conf = JSON.parse(process.env.conf);

const postgres = pgp(conf.pg);

module.exports = {
    pg: postgres,
    helpers: pgp.helpers
};