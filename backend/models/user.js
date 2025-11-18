'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });

      User.hasMany(models.Booking, {
        foreignKey: 'userId',
        as: 'bookings'
      });

      if (models.CompanyUser) {
        User.hasMany(models.CompanyUser, {
          foreignKey: 'userId',
          as: 'companyMemberships'
        });
      }

      if (models.SeatLock) {
        User.hasMany(models.SeatLock, {
          foreignKey: 'userId',
          as: 'seatLocks'
        });
      }

      if (models.UserVoucher) {
        User.hasMany(models.UserVoucher, {
          foreignKey: 'userId',
          as: 'voucherWallet'
        });
      }

      if (models.Driver) {
        User.hasOne(models.Driver, {
          foreignKey: 'userId',
          as: 'driverProfile'
        });
      }
    }
  }

  User.init({
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    phone: DataTypes.STRING,
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'company', 'driver', 'passenger'),
      allowNull: false,
      defaultValue: 'passenger'
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bus_companies',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
      defaultValue: 'ACTIVE'
    },
    lastLoginAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true
  });

  return User;
};
