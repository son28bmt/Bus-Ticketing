const { DataTypes } = require('sequelize');

const Booking = (sequelize) => {
  const BookingModel = sequelize.define('Booking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bookingCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    tripId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'trips',
        key: 'id'
      }
    },
    passengerName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passengerPhone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passengerEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    seatNumbers: {
      type: DataTypes.JSON,
      allowNull: false
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED'),
      defaultValue: 'PENDING'
    },
    bookingStatus: {
      type: DataTypes.ENUM('CONFIRMED', 'CANCELLED', 'COMPLETED'),
      defaultValue: 'CONFIRMED'
    },
    paymentMethod: {
      type: DataTypes.ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET', 'VNPAY'),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'bookings',
    timestamps: true
  });

  // ✅ Define associations within model function
  BookingModel.associate = (models) => {
    // Booking belongs to User
    BookingModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // Booking belongs to Trip
    BookingModel.belongsTo(models.Trip, {
      foreignKey: 'tripId',
      as: 'trip'
    });

    // Booking has many Payments
    BookingModel.hasMany(models.Payment, {
      foreignKey: 'bookingId',
      as: 'payments'
    });
  };

  return BookingModel;
};

module.exports = Booking;