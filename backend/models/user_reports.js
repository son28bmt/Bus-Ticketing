'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserReports = sequelize.define('UserReport', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    bookingId: { type: DataTypes.INTEGER, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('PENDING','REVIEWED','ACTION_TAKEN'), defaultValue: 'PENDING' }
  }, {
    tableName: 'user_reports',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
  });

  UserReports.associate = function(models) {
    UserReports.belongsTo(models.BusCompany, { foreignKey: 'companyId', as: 'company' });
    UserReports.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    UserReports.belongsTo(models.Booking, { foreignKey: 'bookingId', as: 'booking' });
  };

  return UserReports;
};
