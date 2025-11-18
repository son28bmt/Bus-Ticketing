require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'bus_ticketing',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('[db] Database connection established successfully.');

    const db = require('../models');
    await db.sequelize.sync({ alter: true });
    console.log('[db] Database synchronized successfully.');

    return db;
  } catch (error) {
    console.error('[db] Unable to connect to database:', error);
    throw error;
  }
};

module.exports = { sequelize, syncDatabase };
