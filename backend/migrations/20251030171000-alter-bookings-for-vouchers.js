'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const fkRefs = await queryInterface.getForeignKeyReferencesForTable('bookings');
      const userIdConstraints = fkRefs.filter((ref) => ref.columnName === 'userId');

      for (const constraint of userIdConstraints) {
        await queryInterface.removeConstraint('bookings', constraint.constraintName, { transaction });
      }

      await queryInterface.changeColumn(
        'bookings',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        { transaction }
      );

      await queryInterface.addConstraint(
        'bookings',
        {
          fields: ['userId'],
          type: 'foreign key',
          name: 'bookings_userId_fkey',
          references: {
            table: 'users',
            field: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'bookings',
        'voucherId',
        {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        { transaction }
      );

      await queryInterface.addConstraint(
        'bookings',
        {
          fields: ['voucherId'],
          type: 'foreign key',
          name: 'bookings_voucherId_fkey',
          references: {
            table: 'vouchers',
            field: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'bookings',
        'discountAmount',
        {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'bookings',
        'guestNotes',
        {
          type: Sequelize.JSON,
          allowNull: true
        },
        { transaction }
      );

      await queryInterface.addIndex('bookings', ['voucherId'], { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeIndex('bookings', ['voucherId'], { transaction }).catch(() => {});

      await queryInterface.removeConstraint('bookings', 'bookings_voucherId_fkey', { transaction }).catch(() => {});

      await queryInterface.removeColumn('bookings', 'guestNotes', { transaction });
      await queryInterface.removeColumn('bookings', 'discountAmount', { transaction });
      await queryInterface.removeColumn('bookings', 'voucherId', { transaction });

      await queryInterface.removeConstraint('bookings', 'bookings_userId_fkey', { transaction }).catch(() => {});

      await queryInterface.changeColumn(
        'bookings',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        { transaction }
      );

      await queryInterface.addConstraint(
        'bookings',
        {
          fields: ['userId'],
          type: 'foreign key',
          name: 'bookings_userId_fkey',
          references: {
            table: 'users',
            field: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
