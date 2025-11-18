'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      guestEmail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      targetRole: {
        type: Sequelize.ENUM('ALL', 'PASSENGER', 'COMPANY', 'ADMIN'),
        allowNull: false,
        defaultValue: 'PASSENGER'
      },
      type: {
        type: Sequelize.ENUM('NEWS', 'BOOKING_STATUS', 'OTHER'),
        allowNull: false,
        defaultValue: 'OTHER'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('UNREAD', 'READ'),
        allowNull: false,
        defaultValue: 'UNREAD'
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  }
};
