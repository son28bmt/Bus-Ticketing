'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop existing unique index on `code` if present
    try {
      await queryInterface.removeIndex('vouchers', ['code']);
    } catch (e) {
      // index might have a different name or not exist; try common names
      try { await queryInterface.removeIndex('vouchers', 'code'); } catch (_) {}
      try { await queryInterface.removeIndex('vouchers', 'vouchers_code_unique'); } catch (_) {}
      try { await queryInterface.removeIndex('vouchers', 'vouchers_code'); } catch (_) {}
    }

    // Add composite unique index on (code, companyId)
    await queryInterface.addIndex('vouchers', ['code', 'companyId'], {
      unique: true,
      name: 'uniq_vouchers_code_company'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove composite index
    try { await queryInterface.removeIndex('vouchers', 'uniq_vouchers_code_company'); } catch (_) {}

    // Recreate unique index on code (global)
    await queryInterface.addIndex('vouchers', ['code'], {
      unique: true,
      name: 'vouchers_code_unique'
    });
  }
};
