'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TripStatusLog extends Model {
    static associate(models) {
      TripStatusLog.belongsTo(models.Trip, {
        foreignKey: 'tripId',
        as: 'trip'
      });

      TripStatusLog.belongsTo(models.Driver, {
        foreignKey: 'driverId',
        as: 'driver'
      });
    }
  }

  TripStatusLog.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    tripId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    previousStatus: {
      type: DataTypes.ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
      allowNull: true
    },
    newStatus: {
      type: DataTypes.ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
      allowNull: false
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TripStatusLog',
    tableName: 'trip_status_logs',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
  });

  return TripStatusLog;
};
