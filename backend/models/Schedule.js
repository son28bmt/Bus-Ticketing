'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Schedule extends Model {
    static associate(models) {
      Schedule.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });

      Schedule.belongsTo(models.Route, {
        foreignKey: 'routeId',
        as: 'route'
      });

      Schedule.belongsTo(models.Bus, {
        foreignKey: 'busId',
        as: 'bus'
      });
    }
  }

  Schedule.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    routeId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    busId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    dayOfWeek: {
      type: DataTypes.TINYINT,
      allowNull: false
    },
    departureTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    durationMin: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Schedule',
    tableName: 'schedules',
    timestamps: true
  });

  return Schedule;
};
