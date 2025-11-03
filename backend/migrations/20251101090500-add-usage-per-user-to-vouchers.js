'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('vouchers', 'usagePerUser', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addIndex('vouchers', ['usagePerUser']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('vouchers', ['usagePerUser']).catch(() => {});
    await queryInterface.removeColumn('vouchers', 'usagePerUser');
  }
};
