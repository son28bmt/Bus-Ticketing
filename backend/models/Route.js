'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Route extends Model {
    static associate(models) {
      Route.belongsTo(models.Location, {
        foreignKey: 'fromLocationId',
        as: 'fromLocation'
      });

      Route.belongsTo(models.Location, {
        foreignKey: 'toLocationId',
        as: 'toLocation'
      });

      Route.hasMany(models.Trip, {
        foreignKey: 'routeId',
        as: 'trips'
      });

      if (models.Schedule) {
        Route.hasMany(models.Schedule, {
          foreignKey: 'routeId',
          as: 'schedules'
        });
      }
    }
  }

  Route.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    fromLocationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    toLocationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    distanceKm: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    durationMin: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Route',
    tableName: 'routes',
    timestamps: true
  });

  return Route;
};
