'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Bus extends Model {
    static associate(models) {
      // Bus thuộc về một nhà xe
      Bus.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });
      
      // Bus có nhiều chuyến đi
      Bus.hasMany(models.Trip, {
        foreignKey: 'busId',
        as: 'trips'
      });

      if (models.Seat) {
        Bus.hasMany(models.Seat, {
          foreignKey: 'busId',
          as: 'seats'
        });
      }

      if (models.Schedule) {
        Bus.hasMany(models.Schedule, {
          foreignKey: 'busId',
          as: 'schedules'
        });
      }
    }
  }

  Bus.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bus_companies',
        key: 'id'
      }
    },
    busNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    busType: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    totalSeats: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    facilities: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Bus',
    tableName: 'buses',
    timestamps: true
  });

  return Bus;
};
