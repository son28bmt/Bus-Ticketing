'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CompanyUser extends Model {
    static associate(models) {
      CompanyUser.belongsTo(models.BusCompany, {
        foreignKey: 'companyId',
        as: 'company'
      });

      CompanyUser.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  CompanyUser.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    roleInCompany: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'STAFF'
    }
  }, {
    sequelize,
    modelName: 'CompanyUser',
    tableName: 'company_users',
    timestamps: true
  });

  return CompanyUser;
};
