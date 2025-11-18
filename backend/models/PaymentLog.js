'use strict';

module.exports = (sequelize, DataTypes) => {
  const PaymentLog = sequelize.define('PaymentLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    eventType: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'INFO'
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true
    },
    response: {
      type: DataTypes.JSON,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'payment_logs',
    timestamps: true
  });

  PaymentLog.associate = (models) => {
    PaymentLog.belongsTo(models.Payment, {
      foreignKey: 'paymentId',
      as: 'payment'
    });
  };

  return PaymentLog;
};
