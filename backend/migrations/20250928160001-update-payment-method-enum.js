'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update payments table to add VNPAY to paymentMethod enum
    await queryInterface.sequelize.query(
      "ALTER TABLE `payments` MODIFY COLUMN `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET', 'VNPAY') NOT NULL"
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to original enum
    await queryInterface.sequelize.query(
      "ALTER TABLE `payments` MODIFY COLUMN `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET') NOT NULL"
    );
  }
};