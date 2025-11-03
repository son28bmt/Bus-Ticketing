'use strict';

module.exports = (sequelize, DataTypes) => {
  const Voucher = sequelize.define('Voucher', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    discountType: {
      type: DataTypes.ENUM('PERCENT', 'AMOUNT'),
      allowNull: false
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    minOrderValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    maxDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    usagePerUser: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    usedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: 'vouchers',
    timestamps: true,
    indexes: [
      {
        name: 'uniq_vouchers_code_company',
        unique: true,
        fields: ['code', 'companyId']
      }
    ]
  });

  Voucher.associate = (models) => {
    if (models.BusCompany) {
      Voucher.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });
    }

    if (models.User) {
      Voucher.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
    }

    if (models.Booking) {
      Voucher.hasMany(models.Booking, {
        foreignKey: 'voucherId',
        as: 'bookings'
      });
    }

    if (models.VoucherUsage) {
      Voucher.hasMany(models.VoucherUsage, {
        foreignKey: 'voucherId',
        as: 'usages'
      });
    }

    if (models.UserVoucher) {
      Voucher.hasMany(models.UserVoucher, {
        foreignKey: 'voucherId',
        as: 'userVouchers'
      });
    }
  };

  return Voucher;
};
