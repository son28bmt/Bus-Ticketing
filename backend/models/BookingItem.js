'use strict';

module.exports = (sequelize, DataTypes) => {
  const BookingItem = sequelize.define('BookingItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    seatId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'booking_items',
    timestamps: true
  });

  BookingItem.associate = (models) => {
    BookingItem.belongsTo(models.Booking, {
      foreignKey: 'bookingId',
      as: 'booking'
    });

    BookingItem.belongsTo(models.Seat, {
      foreignKey: 'seatId',
      as: 'seat'
    });
  };

  return BookingItem;
};
