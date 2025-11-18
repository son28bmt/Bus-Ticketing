'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      Driver.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      Driver.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });

      Driver.hasMany(models.Trip, {
        foreignKey: 'driverId',
        as: 'trips'
      });

      if (models.TripStatusLog) {
        Driver.hasMany(models.TripStatusLog, {
          foreignKey: 'driverId',
          as: 'statusLogs'
        });
      }

      if (models.TripReport) {
        Driver.hasMany(models.TripReport, {
          foreignKey: 'driverId',
          as: 'reports'
        });
      }
    }
  }

  Driver.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    licenseNumber: DataTypes.STRING,
    phone: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
      defaultValue: 'ACTIVE'
    }
  }, {
    sequelize,
    modelName: 'Driver',
    tableName: 'drivers',
    timestamps: true
  });

  return Driver;
};
