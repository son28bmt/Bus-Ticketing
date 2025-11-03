'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sql = queryInterface.sequelize;

    await sql.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` VARCHAR(20)
      NOT NULL DEFAULT 'PASSENGER'
    `);

    await sql.query("UPDATE `users` SET `role` = 'admin' WHERE `role` IN ('SUPER_ADMIN', 'ADMIN')");
    await sql.query("UPDATE `users` SET `role` = 'company' WHERE `role` IN ('COMPANY_ADMIN', 'COMPANY')");
    await sql.query("UPDATE `users` SET `role` = 'passenger' WHERE `role` IN ('PASSENGER')");

    await sql.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` ENUM('admin', 'company', 'passenger')
      NOT NULL DEFAULT 'passenger'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    const sql = queryInterface.sequelize;

    await sql.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` VARCHAR(20)
      NOT NULL DEFAULT 'passenger'
    `);

    await sql.query("UPDATE `users` SET `role` = 'ADMIN' WHERE `role` = 'admin'");
    await sql.query("UPDATE `users` SET `role` = 'COMPANY' WHERE `role` = 'company'");
    await sql.query("UPDATE `users` SET `role` = 'PASSENGER' WHERE `role` = 'passenger'");

    await sql.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` ENUM('SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'COMPANY', 'PASSENGER')
      NOT NULL DEFAULT 'PASSENGER'
    `);
  }
};
