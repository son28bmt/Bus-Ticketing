'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserVoucher = sequelize.define('UserVoucher', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    voucherId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    savedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    tableName: 'user_vouchers',
    timestamps: true
  });

  UserVoucher.associate = (models) => {
    if (models.User) {
      UserVoucher.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }

    if (models.Voucher) {
      UserVoucher.belongsTo(models.Voucher, {
        foreignKey: 'voucherId',
        as: 'voucher'
      });
    }
  };

  return UserVoucher;
};
