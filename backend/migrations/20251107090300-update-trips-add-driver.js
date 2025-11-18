'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('trips', 'driverId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'drivers',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addColumn('trips', 'startedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('trips', 'endedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addIndex('trips', ['driverId'], {
      name: 'idx_trips_driver'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('trips', 'idx_trips_driver').catch(() => {});
    await queryInterface.removeColumn('trips', 'endedAt').catch(() => {});
    await queryInterface.removeColumn('trips', 'startedAt').catch(() => {});
    await queryInterface.removeColumn('trips', 'driverId').catch(() => {});
  }
};
