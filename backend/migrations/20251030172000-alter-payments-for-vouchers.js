'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payments', 'voucherId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'vouchers',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addColumn('payments', 'discountAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addIndex('payments', ['voucherId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('payments', ['voucherId']).catch(() => {});
    await queryInterface.removeColumn('payments', 'discountAmount');
    await queryInterface.removeColumn('payments', 'voucherId');
  }
};
