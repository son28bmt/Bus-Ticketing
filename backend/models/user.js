'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User có thể thuộc về một nhà xe (nếu là admin)
      User.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });
      
      // User có nhiều booking
      User.hasMany(models.Booking, {
        foreignKey: 'userId',
        as: 'bookings'
      });
    }
  }

  User.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    phone: DataTypes.STRING,
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'PASSENGER'),
      defaultValue: 'PASSENGER'
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bus_companies',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
      defaultValue: 'ACTIVE'
    },
    lastLoginAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true
  });

  return User;
};