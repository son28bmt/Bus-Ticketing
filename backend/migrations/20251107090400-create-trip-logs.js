'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('trip_status_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      tripId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'trips',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      driverId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'drivers',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      previousStatus: {
        type: Sequelize.ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
        allowNull: true
      },
      newStatus: {
        type: Sequelize.ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
        allowNull: false
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('trip_status_logs', ['tripId'], { name: 'idx_trip_logs_trip' });

    await queryInterface.createTable('trip_reports', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      tripId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'trips',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      driverId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'drivers',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bus_companies',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('trip_reports', ['tripId'], { name: 'idx_trip_reports_trip' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('trip_reports', 'idx_trip_reports_trip').catch(() => {});
    await queryInterface.dropTable('trip_reports').catch(() => {});

    await queryInterface.removeIndex('trip_status_logs', 'idx_trip_logs_trip').catch(() => {});
    await queryInterface.dropTable('trip_status_logs').catch(() => {});
  }
};
