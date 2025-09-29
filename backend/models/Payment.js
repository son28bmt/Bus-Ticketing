"use strict";

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    paymentCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bookings',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET', 'VNPAY'),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'),
      defaultValue: 'PENDING'
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentDetails: {
      type: DataTypes.JSON,
      allowNull: true
    },
    paidAt: {
      type: DataTypes.DATE,
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
    tableName: 'payments',
    timestamps: true
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Booking, {
      foreignKey: 'bookingId',
      as: 'booking'
    });
    if (models.VNPayTransaction) {
      Payment.hasMany(models.VNPayTransaction, {
        foreignKey: 'paymentId',
        as: 'vnpayTransactions',
        onDelete: 'CASCADE'
      });
    }
  };

  return Payment;
};