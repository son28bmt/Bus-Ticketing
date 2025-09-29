'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BusCompany extends Model {
    static associate(models) {
      // Một nhà xe có nhiều xe bus
      BusCompany.hasMany(models.Bus, {
        foreignKey: 'companyId',
        as: 'buses'
      });
      
      // Một nhà xe có nhiều chuyến
      BusCompany.hasMany(models.Trip, {
        foreignKey: 'companyId',
        as: 'trips'
      });
      
      // Một nhà xe có nhiều admin
      BusCompany.hasMany(models.User, {
        foreignKey: 'companyId',
        as: 'admins'
      });
    }
  }

  BusCompany.init({
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
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    address: DataTypes.TEXT,
    description: DataTypes.TEXT,
    logo: DataTypes.STRING,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'BusCompany',
    tableName: 'bus_companies',
    timestamps: true
  });

  return BusCompany;
};