"use strict";

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      paymentCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      bookingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "bookings",
          key: "id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      paymentMethod: {
        type: DataTypes.ENUM(
          "CASH",
          "BANK_TRANSFER",
          "CREDIT_CARD",
          "E_WALLET",
          "VNPAY"
        ),
        allowNull: false,
      },
      paymentStatus: {
        type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED", "CANCELLED"),
        defaultValue: "PENDING",
      },
      transactionId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      voucherId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "vouchers", key: "id" },
      },
      paymentDetails: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "bus_companies",
          key: "id",
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "payments",
      timestamps: true,
    }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Booking, {
      foreignKey: "bookingId",
      as: "booking",
    });

    Payment.belongsTo(models.BusCompany, {
      foreignKey: "companyId",
      as: "company",
    });

    if (models.VNPayTransaction) {
      Payment.hasMany(models.VNPayTransaction, {
        foreignKey: "paymentId",
        as: "vnpayTransactions",
        onDelete: "CASCADE",
      });
    }

    if (models.Voucher) {
      Payment.belongsTo(models.Voucher, {
        foreignKey: "voucherId",
        as: "voucher",
      });
    }
    if (models.PaymentLog) {
      Payment.hasMany(models.PaymentLog, {
        foreignKey: "paymentId",
        as: "logs",
        onDelete: "CASCADE",
      });
    }
  };

  return Payment;
};
