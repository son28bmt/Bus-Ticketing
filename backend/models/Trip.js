'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Trip extends Model {
    static associate(models) {
      // Trip thuộc về một nhà xe
      Trip.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });
      
      // Trip sử dụng một xe bus
      Trip.belongsTo(models.Bus, {
        foreignKey: 'busId',
        as: 'bus'
      });

      Trip.belongsTo(models.Route, {
        foreignKey: 'routeId',
        as: 'route'
      });
      
      // Trip có điểm đi và điểm đến
      Trip.belongsTo(models.Location, {
        foreignKey: 'departureLocationId',
        as: 'departureLocation'
      });
      
      Trip.belongsTo(models.Location, {
        foreignKey: 'arrivalLocationId',
        as: 'arrivalLocation'
      });
      
      // Trip có nhiều booking
      Trip.hasMany(models.Booking, {
        foreignKey: 'tripId',
        as: 'bookings'
      });

      if (models.SeatLock) {
        Trip.hasMany(models.SeatLock, {
          foreignKey: 'tripId',
          as: 'seatLocks'
        });
      }
    }
  }

  Trip.init({
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
    busId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'buses',
        key: 'id'
      }
    },
    routeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'routes',
        key: 'id'
      }
    },
    departureLocationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    arrivalLocationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    departureTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    arrivalTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'SCHEDULED'
    },
    totalSeats: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    availableSeats: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Trip',
    tableName: 'trips',
    timestamps: true
  });

  return Trip;
};
