// backend/data/dbConfig.js
const knex = require('knex');
const knexConfig = require('../knexfile.js');

// Определяем, какую конфигурацию использовать (например, 'development')
// Можно сделать это более гибким, используя process.env.NODE_ENV
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

module.exports = knex(config);