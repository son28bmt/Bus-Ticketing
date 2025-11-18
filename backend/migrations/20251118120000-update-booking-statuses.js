'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE bookings
      MODIFY COLUMN bookingStatus ENUM('CONFIRMED','CANCELLED','COMPLETED','CANCEL_REQUESTED') NOT NULL DEFAULT 'CONFIRMED'
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE bookings
      MODIFY COLUMN paymentStatus ENUM('PENDING','PAID','CANCELLED','REFUNDED','REFUND_PENDING') NOT NULL DEFAULT 'PENDING'
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE bookings
      MODIFY COLUMN bookingStatus ENUM('CONFIRMED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'CONFIRMED'
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE bookings
      MODIFY COLUMN paymentStatus ENUM('PENDING','PAID','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING'
    `);
  }
};

