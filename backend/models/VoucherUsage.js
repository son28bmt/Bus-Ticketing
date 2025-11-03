'use strict';

module.exports = (sequelize, DataTypes) => {
  const VoucherUsage = sequelize.define('VoucherUsage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    voucherId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    appliedDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
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
    tableName: 'voucher_usages',
    timestamps: true
  });

  VoucherUsage.associate = (models) => {
    if (models.Voucher) {
      VoucherUsage.belongsTo(models.Voucher, {
        foreignKey: 'voucherId',
        as: 'voucher'
      });
    }

    if (models.Booking) {
      VoucherUsage.belongsTo(models.Booking, {
        foreignKey: 'bookingId',
        as: 'booking'
      });
    }

    if (models.User) {
      VoucherUsage.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  };

  return VoucherUsage;
};
