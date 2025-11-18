'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bookings', 'cancelReason', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('bookings', 'refundAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bookings', 'cancelReason');
    await queryInterface.removeColumn('bookings', 'refundAmount');
  }
};

