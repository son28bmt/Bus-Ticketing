'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  Notification.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      guestEmail: DataTypes.STRING,
      targetRole: {
        type: DataTypes.ENUM('ALL', 'PASSENGER', 'COMPANY', 'ADMIN'),
        defaultValue: 'PASSENGER'
      },
      type: {
        type: DataTypes.ENUM('NEWS', 'BOOKING_STATUS', 'OTHER'),
        defaultValue: 'OTHER'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      payload: DataTypes.JSON,
      status: {
        type: DataTypes.ENUM('UNREAD', 'READ'),
        defaultValue: 'UNREAD'
      },
      readAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      timestamps: true
    }
  );

  return Notification;
};
