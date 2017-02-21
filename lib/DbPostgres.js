'use strict';

/**
 * @module
 * @description couche d'accès à la base PostgreSQL
 */

const pgp = require('pg-promise')();

const conf = require('./conf.json');

const postgres = pgp(conf.pg);

module.exports = postgres;
module.exports.helpers = pgp.helpers;