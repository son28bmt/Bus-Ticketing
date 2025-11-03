'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_vouchers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
      voucherId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'vouchers',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      savedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      isUsed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('user_vouchers', {
      fields: ['userId', 'voucherId'],
      type: 'unique',
      name: 'user_vouchers_userId_voucherId_key'
    });

    await queryInterface.addIndex('user_vouchers', ['userId']);
    await queryInterface.addIndex('user_vouchers', ['voucherId']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('user_vouchers', ['voucherId']).catch(() => {});
    await queryInterface.removeIndex('user_vouchers', ['userId']).catch(() => {});
    await queryInterface.removeConstraint('user_vouchers', 'user_vouchers_userId_voucherId_key').catch(() => {});
    await queryInterface.dropTable('user_vouchers');
  }
};
