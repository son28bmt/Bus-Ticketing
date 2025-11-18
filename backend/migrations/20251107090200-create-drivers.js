'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('drivers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
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
      licenseNumber: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(32),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
        allowNull: false,
        defaultValue: 'ACTIVE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('drivers', {
      fields: ['userId'],
      type: 'unique',
      name: 'uq_drivers_user'
    });

    await queryInterface.addIndex('drivers', ['companyId'], {
      name: 'idx_drivers_company'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('drivers', 'idx_drivers_company').catch(() => {});
    await queryInterface.removeConstraint('drivers', 'uq_drivers_user').catch(() => {});
    await queryInterface.dropTable('drivers');
  }
};
