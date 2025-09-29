'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

console.log('🔄 Initializing database connection...');

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// ✅ Load all model files and initialize them
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 && 
      file !== basename && 
      file.slice(-3) === '.js' &&
      file !== 'index.js'
    );
  })
  .forEach(file => {
    console.log('📄 Loading model:', file);
    const modelDefiner = require(path.join(__dirname, file));
    
    // ✅ Call the model definer function with sequelize instance
    const model = modelDefiner(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
    
    console.log('✅ Model loaded:', model.name);
  });

console.log('📊 Available models:', Object.keys(db));

// ✅ Setup associations from model definitions first
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    console.log('🔗 Setting up model associations for:', modelName);
    db[modelName].associate(db);
  }
});

// ✅ ONLY manual associations that don't conflict with model definitions
console.log('🔗 Setting up additional manual associations...');

// ✅ REMOVE duplicated associations - these are already in model files
// User <-> Booking (already in models)
// Trip <-> Booking (already in models)  
// Bus <-> Trip (already in models)
// Bus <-> Seat (already in models)

// ✅ Add ONLY missing associations not defined in models
if (db.Booking && db.Payment) {
  // Check if association already exists
  if (!db.Booking.associations.payments) {
    db.Booking.hasMany(db.Payment, { 
      foreignKey: 'bookingId', 
      as: 'payments',
      onDelete: 'CASCADE'
    });
    console.log('✅ Booking -> Payment association added');
  }
  
  if (!db.Payment.associations.booking) {
    db.Payment.belongsTo(db.Booking, { 
      foreignKey: 'bookingId', 
      as: 'booking'
    });
    console.log('✅ Payment -> Booking association added');
  }
}

// ✅ VNPayTransaction associations
if (db.Payment && db.VNPayTransaction) {
  if (!db.Payment.associations.vnpayTransactions) {
    db.Payment.hasMany(db.VNPayTransaction, {
      foreignKey: 'paymentId',
      as: 'vnpayTransactions',
      onDelete: 'CASCADE'
    });
    console.log('✅ Payment -> VNPayTransaction association added');
  }
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log('✅ Database models initialized successfully!');

module.exports = db;