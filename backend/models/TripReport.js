'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TripReport extends Model {
    static associate(models) {
      TripReport.belongsTo(models.Trip, {
        foreignKey: 'tripId',
        as: 'trip'
      });

      TripReport.belongsTo(models.Driver, {
        foreignKey: 'driverId',
        as: 'driver'
      });

      TripReport.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });
    }
  }

  TripReport.init({
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
      allowNull: false
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'TripReport',
    tableName: 'trip_reports',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
  });

  return TripReport;
};
