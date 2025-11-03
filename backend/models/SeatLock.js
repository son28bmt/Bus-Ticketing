'use strict';

module.exports = (sequelize, DataTypes) => {
  const SeatLock = sequelize.define('SeatLock', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tripId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    seatId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'seat_locks',
    timestamps: true
  });

  SeatLock.associate = (models) => {
    SeatLock.belongsTo(models.Trip, {
      foreignKey: 'tripId',
      as: 'trip'
    });

    SeatLock.belongsTo(models.Seat, {
      foreignKey: 'seatId',
      as: 'seat'
    });

    SeatLock.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return SeatLock;
};
