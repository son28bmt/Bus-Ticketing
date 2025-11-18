'use strict';

module.exports = {
  up: async (queryInterface) => {
    const tableName = 'bookings';
    const constraintName = 'bookings_trip_id_seat_id';

    const [results] = await queryInterface.sequelize.query(
      `
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND CONSTRAINT_NAME = :constraintName
      `,
      {
        replacements: { tableName, constraintName }
      }
    );

    if (Array.isArray(results) && results.length > 0) {
      await queryInterface.removeConstraint(tableName, constraintName);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.addConstraint('bookings', {
      type: 'unique',
      name: 'bookings_trip_id_seat_id',
      fields: ['tripId']
    });
  }
};
