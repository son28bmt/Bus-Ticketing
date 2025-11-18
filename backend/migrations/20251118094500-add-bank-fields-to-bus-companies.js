'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bus_companies', 'bankName', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('bus_companies', 'bankAccountName', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('bus_companies', 'bankAccountNumber', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('bus_companies', 'bankCode', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bus_companies', 'bankName');
    await queryInterface.removeColumn('bus_companies', 'bankAccountName');
    await queryInterface.removeColumn('bus_companies', 'bankAccountNumber');
    await queryInterface.removeColumn('bus_companies', 'bankCode');
  }
};
