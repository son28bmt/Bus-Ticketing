'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Invoice extends Model {
    static associate(models) {
      Invoice.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });

      Invoice.belongsTo(models.Booking, {
        foreignKey: 'bookingId',
        as: 'booking'
      });

      Invoice.belongsTo(models.Payment, {
        foreignKey: 'paymentId',
        as: 'payment'
      });
    }
  }

  Invoice.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    invoiceNumber: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'ISSUED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    issuedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Invoice',
    tableName: 'invoices',
    timestamps: true
  });

  return Invoice;
};
