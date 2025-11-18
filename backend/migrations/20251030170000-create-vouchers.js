'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vouchers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      discountType: {
        type: Sequelize.ENUM('PERCENT', 'AMOUNT'),
        allowNull: false
      },
      discountValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      minOrderValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      maxDiscount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      usageLimit: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      usedCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'bus_companies',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.createTable('voucher_usages', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      appliedDiscount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
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

    await queryInterface.addIndex('vouchers', ['companyId']);
    await queryInterface.addIndex('vouchers', ['isActive', 'startDate', 'endDate']);
    await queryInterface.addIndex('voucher_usages', ['voucherId']);
    await queryInterface.addIndex('voucher_usages', ['bookingId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('voucher_usages', ['bookingId']).catch(() => {});
    await queryInterface.removeIndex('voucher_usages', ['voucherId']).catch(() => {});
    await queryInterface.removeIndex('vouchers', ['isActive', 'startDate', 'endDate']).catch(() => {});
    await queryInterface.removeIndex('vouchers', ['companyId']).catch(() => {});
    await queryInterface.dropTable('voucher_usages');
    await queryInterface.dropTable('vouchers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_vouchers_discountType\";').catch(() => {});
  }
};
