'use strict';

module.exports = {
  up: async (queryInterface) => {
    const sql = queryInterface.sequelize;

    await sql.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` VARCHAR(20)
      NOT NULL DEFAULT 'passenger'
    `);

    await sql.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` ENUM('admin', 'company', 'driver', 'passenger')
      NOT NULL DEFAULT 'passenger'
    `);
  },

  down: async (queryInterface) => {
    const sql = queryInterface.sequelize;

    await sql.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` VARCHAR(20)
      NOT NULL DEFAULT 'passenger'
    `);

    await sql.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` ENUM('admin', 'company', 'passenger')
      NOT NULL DEFAULT 'passenger'
    `);
  }
};
