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

      BusCompany.hasMany(models.Booking, {
        foreignKey: 'companyId',
        as: 'bookings'
      });

      BusCompany.hasMany(models.Payment, {
        foreignKey: 'companyId',
        as: 'payments'
      });

      if (models.CompanyUser) {
        BusCompany.hasMany(models.CompanyUser, {
          foreignKey: 'companyId',
          as: 'members'
        });
      }

      if (models.Schedule) {
        BusCompany.hasMany(models.Schedule, {
          foreignKey: 'companyId',
          as: 'schedules'
        });
      }

      if (models.Invoice) {
        BusCompany.hasMany(models.Invoice, {
          foreignKey: 'companyId',
          as: 'invoices'
        });
      }
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
