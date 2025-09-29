require("dotenv").config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'bus_ticketing',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Function để sync database
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Import models từ thư mục models ở root
    const db = require('../../models'); // Sửa từ '../../../models' thành '../../models'
    
    // Sync database - tạo bảng nếu chưa có, alter nếu đã có
    await db.sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully.');
    
    return db;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    throw error;
  }
};

module.exports = { sequelize, syncDatabase };