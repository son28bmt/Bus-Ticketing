'use strict';

module.exports = (sequelize, DataTypes) => {
  const VNPayTransaction = sequelize.define('VNPayTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Payment',
        key: 'id'
      }
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Mã đơn hàng VNPay'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Số tiền thanh toán'
    },
    orderInfo: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Thông tin đơn hàng'
    },
    bankCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Mã ngân hàng'
    },
    paymentUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL thanh toán VNPay'
    },
    transactionNo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Mã giao dịch VNPay'
    },
    responseCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Mã phản hồi từ VNPay'
    },
    responseMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Thông điệp phản hồi từ VNPay'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'),
      defaultValue: 'PENDING',
      comment: 'Trạng thái giao dịch'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Thời gian thanh toán thành công'
    }
  }, {
    tableName: 'vnpay_transactions',
    timestamps: true,
    indexes: [
      {
        fields: ['paymentId']
      },
      {
        fields: ['orderId'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['transactionNo']
      }
    ]
  });

  // ✅ Associations
  VNPayTransaction.associate = function(models) {
    // Many-to-One with Payment
    VNPayTransaction.belongsTo(models.Payment, {
      foreignKey: 'paymentId',
      as: 'payment',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return VNPayTransaction;
};