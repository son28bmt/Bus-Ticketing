'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const qi = queryInterface;

    // 1) Add companyId to users
    const tableUsers = await qi.describeTable('users').catch(() => ({}));
    if (!tableUsers.companyId) {
      await qi.addColumn('users', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await qi.addConstraint('users', {
        fields: ['companyId'],
        type: 'foreign key',
        name: 'fk_users_company',
        references: { table: 'bus_companies', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      }).catch(() => {});
    }

    // 2) Add companyId to buses
    const tableBuses = await qi.describeTable('buses').catch(() => ({}));
    if (!tableBuses.companyId) {
      await qi.addColumn('buses', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await qi.addConstraint('buses', {
        fields: ['companyId'],
        type: 'foreign key',
        name: 'fk_buses_company',
        references: { table: 'bus_companies', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }).catch(() => {});
    }

    // 3) Add companyId to trips
    const tableTrips = await qi.describeTable('trips').catch(() => ({}));
    if (!tableTrips.companyId) {
      await qi.addColumn('trips', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await qi.addConstraint('trips', {
        fields: ['companyId'],
        type: 'foreign key',
        name: 'fk_trips_company',
        references: { table: 'bus_companies', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }).catch(() => {});
    }

    // 4) Create user_reports table if not exists
    const tables = await qi.showAllTables();
    const hasUserReports = tables.includes('user_reports') || tables.includes('UserReports');
    if (!hasUserReports) {
      await qi.createTable('user_reports', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        companyId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        bookingId: { type: Sequelize.INTEGER, allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.ENUM('PENDING','REVIEWED','ACTION_TAKEN'), allowNull: false, defaultValue: 'PENDING' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await qi.addConstraint('user_reports', {
        fields: ['companyId'],
        type: 'foreign key',
        name: 'fk_userreports_company',
        references: { table: 'bus_companies', field: 'id' },
        onDelete: 'CASCADE', onUpdate: 'CASCADE'
      }).catch(() => {});
      await qi.addConstraint('user_reports', {
        fields: ['userId'],
        type: 'foreign key',
        name: 'fk_userreports_user',
        references: { table: 'users', field: 'id' },
        onDelete: 'CASCADE', onUpdate: 'CASCADE'
      }).catch(() => {});
      await qi.addConstraint('user_reports', {
        fields: ['bookingId'],
        type: 'foreign key',
        name: 'fk_userreports_booking',
        references: { table: 'bookings', field: 'id' },
        onDelete: 'SET NULL', onUpdate: 'CASCADE'
      }).catch(() => {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    const qi = queryInterface;
    // drop user_reports
    await qi.dropTable('user_reports').catch(() => {});
    // remove constraints and columns (best-effort)
    try { await qi.removeConstraint('trips', 'fk_trips_company'); } catch(e){}
    try { await qi.removeColumn('trips', 'companyId'); } catch(e){}
    try { await qi.removeConstraint('buses', 'fk_buses_company'); } catch(e){}
    try { await qi.removeColumn('buses', 'companyId'); } catch(e){}
    try { await qi.removeConstraint('users', 'fk_users_company'); } catch(e){}
    try { await qi.removeColumn('users', 'companyId'); } catch(e){}
    // remove enum type if exists (Postgres specific) - ignore for MySQL
  }
};
