'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vnpay_transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      paymentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'payments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      orderId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      orderInfo: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      bankCode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      paymentUrl: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      transactionNo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      responseCode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      responseMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'),
        defaultValue: 'PENDING'
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('vnpay_transactions', ['paymentId']);
    await queryInterface.addIndex('vnpay_transactions', ['orderId'], { unique: true });
    await queryInterface.addIndex('vnpay_transactions', ['status']);
    await queryInterface.addIndex('vnpay_transactions', ['transactionNo']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vnpay_transactions');
  }
};