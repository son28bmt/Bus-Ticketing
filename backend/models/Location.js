'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    static associate(models) {
      // Locations used in trips as departure/arrival
      Location.hasMany(models.Trip, {
        foreignKey: 'departureLocationId',
        as: 'departureTrips'
      });
      
      Location.hasMany(models.Trip, {
        foreignKey: 'arrivalLocationId',
        as: 'arrivalTrips'
      });

      if (models.Route) {
        Location.hasMany(models.Route, {
          foreignKey: 'fromLocationId',
          as: 'originRoutes'
        });

        Location.hasMany(models.Route, {
          foreignKey: 'toLocationId',
          as: 'destinationRoutes'
        });
      }
    }
  }

  Location.init({
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
    code: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    province: DataTypes.STRING,
    address: DataTypes.TEXT,
    coordinates: DataTypes.JSON, // {lat, lng}
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Location',
    tableName: 'locations',
    timestamps: true
  });

  return Location;
};
