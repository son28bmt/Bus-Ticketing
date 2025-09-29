'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update bookings table to add VNPAY to paymentMethod enum
    await queryInterface.sequelize.query(
      "ALTER TABLE `bookings` MODIFY COLUMN `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET', 'VNPAY') NULL"
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to original enum without VNPAY
    await queryInterface.sequelize.query(
      "ALTER TABLE `bookings` MODIFY COLUMN `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET') NULL"
    );
  }
};
