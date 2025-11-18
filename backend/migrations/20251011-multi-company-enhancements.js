'use strict';

const ensureNoNulls = async (sequelize, tableName, columnName) => {
  const [[result]] = await sequelize.query(
    `SELECT COUNT(*) AS missingCount FROM \`${tableName}\` WHERE \`${columnName}\` IS NULL`
  );
  if (result.missingCount > 0) {
    throw new Error(
      `Migration aborted: ${tableName}.${columnName} still contains ${result.missingCount} NULL value(s). ` +
      `Please clean up data before re-running the migration.`
    );
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const qi = queryInterface;
    const sql = qi.sequelize;

    // 1) Harden companyId columns and indexes on buses and trips
    const busesTable = await qi.describeTable('buses').catch(() => ({}));
    if (busesTable.companyId) {
      await qi.removeConstraint('buses', 'fk_buses_company_enforced').catch(() => {});
      await qi.removeConstraint('buses', 'fk_buses_company').catch(() => {});
      await qi.removeConstraint('buses', 'buses_ibfk_1').catch(() => {});

      await sql.query(`
        UPDATE buses b
        INNER JOIN trips t ON t.busId = b.id
        SET b.companyId = t.companyId
        WHERE b.companyId IS NULL AND t.companyId IS NOT NULL
      `);

      await ensureNoNulls(sql, 'buses', 'companyId');

      await qi.changeColumn('buses', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: false
      });

      await qi.addIndex('buses', ['companyId'], {
        name: 'idx_buses_companyId'
      }).catch(() => {});

      await qi.addConstraint('buses', {
        fields: ['companyId'],
        type: 'foreign key',
        name: 'fk_buses_company_enforced',
        references: { table: 'bus_companies', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }).catch(() => {});
    }

    const tripsTable = await qi.describeTable('trips').catch(() => ({}));
    if (tripsTable.companyId) {
      await qi.removeConstraint('trips', 'fk_trips_company_enforced').catch(() => {});
      await qi.removeConstraint('trips', 'fk_trips_company').catch(() => {});
      await qi.removeConstraint('trips', 'trips_ibfk_1').catch(() => {});
      await qi.removeConstraint('trips', 'trips_ibfk_2').catch(() => {});
      await qi.removeConstraint('trips', 'trips_ibfk_3').catch(() => {});

      await sql.query(`
        UPDATE trips t
        INNER JOIN buses b ON b.id = t.busId
        SET t.companyId = b.companyId
        WHERE t.companyId IS NULL AND b.companyId IS NOT NULL
      `);

      await ensureNoNulls(sql, 'trips', 'companyId');

      await qi.changeColumn('trips', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: false
      });

      await qi.addIndex('trips', ['companyId'], {
        name: 'idx_trips_companyId'
      }).catch(() => {});

      await qi.addConstraint('trips', {
        fields: ['companyId'],
        type: 'foreign key',
        name: 'fk_trips_company_enforced',
        references: { table: 'bus_companies', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }).catch(() => {});

      await qi.addConstraint('trips', {
        fields: ['busId'],
        type: 'foreign key',
        name: 'fk_trips_bus_enforced',
        references: { table: 'buses', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }).catch(() => {});
    }

    // 2) Add companyId to bookings
    const bookingsTable = await qi.describeTable('bookings').catch(() => ({}));
    if (!bookingsTable.companyId) {
      await qi.addColumn('bookings', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: 'tripId'
      });
    }

    await sql.query(`
      UPDATE bookings b
      INNER JOIN trips t ON t.id = b.tripId
      SET b.companyId = t.companyId
      WHERE b.companyId IS NULL
    `);

    await ensureNoNulls(sql, 'bookings', 'companyId');

    await qi.changeColumn('bookings', 'companyId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await qi.addIndex('bookings', ['companyId'], {
      name: 'idx_bookings_companyId'
    }).catch(() => {});

    await qi.addConstraint('bookings', {
      fields: ['companyId'],
      type: 'foreign key',
      name: 'fk_bookings_company',
      references: { table: 'bus_companies', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }).catch(() => {});

    await qi.addConstraint('bookings', {
      fields: ['tripId'],
      type: 'foreign key',
      name: 'fk_bookings_trip',
      references: { table: 'trips', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }).catch(() => {});

    await qi.addConstraint('bookings', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_bookings_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }).catch(() => {});

    // 3) Add companyId to payments
    const paymentsTable = await qi.describeTable('payments').catch(() => ({}));
    if (!paymentsTable.companyId) {
      await qi.addColumn('payments', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: 'bookingId'
      });
    }

    await sql.query(`
      UPDATE payments p
      INNER JOIN bookings b ON b.id = p.bookingId
      SET p.companyId = b.companyId
      WHERE p.companyId IS NULL
    `);

    await ensureNoNulls(sql, 'payments', 'companyId');

    await qi.changeColumn('payments', 'companyId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await qi.addIndex('payments', ['companyId'], {
      name: 'idx_payments_companyId'
    }).catch(() => {});

    await qi.addConstraint('payments', {
      fields: ['companyId'],
      type: 'foreign key',
      name: 'fk_payments_company',
      references: { table: 'bus_companies', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }).catch(() => {});

    await qi.addConstraint('payments', {
      fields: ['bookingId'],
      type: 'foreign key',
      name: 'fk_payments_booking',
      references: { table: 'bookings', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }).catch(() => {});

    // 4) Routes table and link to trips
    const routesTableExists = await qi.sequelize
      .query("SHOW TABLES LIKE 'routes'")
      .then(([rows]) => rows.length > 0);

    if (!routesTableExists) {
      await qi.createTable('routes', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        fromLocationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'locations',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        toLocationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'locations',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        distanceKm: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        basePrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        durationMin: {
          type: Sequelize.INTEGER,
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

      await qi.addIndex('routes', ['fromLocationId', 'toLocationId'], {
        unique: true,
        name: 'uk_routes_from_to'
      });
    }

    if (!tripsTable.routeId) {
      await qi.addColumn('trips', 'routeId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: 'companyId'
      });
    }

    await sql.query(`
      INSERT IGNORE INTO routes (fromLocationId, toLocationId, basePrice, durationMin, distanceKm, createdAt, updatedAt)
      SELECT
        t.departureLocationId,
        t.arrivalLocationId,
        MAX(t.basePrice),
        CAST(AVG(TIMESTAMPDIFF(MINUTE, t.departureTime, t.arrivalTime)) AS SIGNED),
        NULL,
        NOW(),
        NOW()
      FROM trips t
      WHERE t.departureLocationId IS NOT NULL AND t.arrivalLocationId IS NOT NULL
      GROUP BY t.departureLocationId, t.arrivalLocationId
    `);

    await sql.query(`
      UPDATE trips t
      INNER JOIN routes r
        ON r.fromLocationId = t.departureLocationId
       AND r.toLocationId = t.arrivalLocationId
      SET t.routeId = r.id
      WHERE t.routeId IS NULL
    `);

    await ensureNoNulls(sql, 'trips', 'routeId');

    await qi.changeColumn('trips', 'routeId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await qi.addConstraint('trips', {
      fields: ['routeId'],
      type: 'foreign key',
      name: 'fk_trips_route',
      references: { table: 'routes', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    }).catch(() => {});

    // 5) Booking items table
    const bookingItemsExists = await qi.sequelize
      .query("SHOW TABLES LIKE 'booking_items'")
      .then(([rows]) => rows.length > 0);

    if (!bookingItemsExists) {
      await qi.createTable('booking_items', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        bookingId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'bookings',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        seatId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'seats',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
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

      await qi.addConstraint('booking_items', {
        fields: ['bookingId', 'seatId'],
        type: 'unique',
        name: 'uk_booking_items_booking_seat'
      });

      await qi.addIndex('booking_items', ['seatId'], {
        name: 'idx_booking_items_seatId'
      });
    }

    // 6) Seat locks table
    const seatLocksExists = await qi.sequelize
      .query("SHOW TABLES LIKE 'seat_locks'")
      .then(([rows]) => rows.length > 0);

    if (!seatLocksExists) {
      await qi.createTable('seat_locks', {
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
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        seatId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'seats',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false
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

      await qi.addConstraint('seat_locks', {
        fields: ['tripId', 'seatId'],
        type: 'unique',
        name: 'uk_seat_locks_trip_seat'
      });

      await qi.addIndex('seat_locks', ['expiresAt'], {
        name: 'idx_seat_locks_expiresAt'
      });
    }

    // 7) Company users table
    const companyUsersExists = await qi.sequelize
      .query("SHOW TABLES LIKE 'company_users'")
      .then(([rows]) => rows.length > 0);

    if (!companyUsersExists) {
      await qi.createTable('company_users', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        companyId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'bus_companies',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        roleInCompany: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'STAFF'
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

      await qi.addConstraint('company_users', {
        fields: ['companyId', 'userId'],
        type: 'unique',
        name: 'uk_company_users_company_user'
      });

      await qi.addIndex('company_users', ['companyId'], {
        name: 'idx_company_users_companyId'
      });

      await qi.addIndex('company_users', ['userId'], {
        name: 'idx_company_users_userId'
      });
    }

    // 8) Schedules table
    const schedulesExists = await qi.sequelize
      .query("SHOW TABLES LIKE 'schedules'")
      .then(([rows]) => rows.length > 0);

    if (!schedulesExists) {
      await qi.createTable('schedules', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        companyId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'bus_companies',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        routeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'routes',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        busId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'buses',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        dayOfWeek: {
          type: Sequelize.TINYINT,
          allowNull: false,
          comment: '0=Sunday, 6=Saturday'
        },
        departureTime: {
          type: Sequelize.TIME,
          allowNull: false
        },
        durationMin: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        effectiveFrom: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        effectiveTo: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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

      await qi.addIndex('schedules', ['companyId'], {
        name: 'idx_schedules_companyId'
      });

      await qi.addIndex('schedules', ['routeId'], {
        name: 'idx_schedules_routeId'
      });
    }

    // 9) Invoices table
    const invoicesExists = await qi.sequelize
      .query("SHOW TABLES LIKE 'invoices'")
      .then(([rows]) => rows.length > 0);

    if (!invoicesExists) {
      await qi.createTable('invoices', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        invoiceNumber: {
          type: Sequelize.STRING(64),
          allowNull: false
        },
        companyId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'bus_companies',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        bookingId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'bookings',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        paymentId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'payments',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        status: {
          type: Sequelize.ENUM('DRAFT', 'ISSUED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'DRAFT'
        },
        subtotal: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        taxRate: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0
        },
        taxAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        totalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        issuedAt: {
          type: Sequelize.DATE,
          allowNull: true
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

      await qi.addIndex('invoices', ['invoiceNumber'], {
        unique: true,
        name: 'uk_invoices_invoiceNumber'
      });

      await qi.addIndex('invoices', ['companyId'], {
        name: 'idx_invoices_companyId'
      });
    }

    // 10) Payment logs table
    const paymentLogsExists = await qi.sequelize
      .query("SHOW TABLES LIKE 'payment_logs'")
      .then(([rows]) => rows.length > 0);

    if (!paymentLogsExists) {
      await qi.createTable('payment_logs', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
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
        eventType: {
          type: Sequelize.STRING(64),
          allowNull: false
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: 'INFO'
        },
        payload: {
          type: Sequelize.JSON,
          allowNull: true
        },
        response: {
          type: Sequelize.JSON,
          allowNull: true
        },
        errorMessage: {
          type: Sequelize.TEXT,
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

      await qi.addIndex('payment_logs', ['paymentId'], {
        name: 'idx_payment_logs_paymentId'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const qi = queryInterface;

    await qi.dropTable('payment_logs').catch(() => {});
    await qi.dropTable('invoices').catch(() => {});
    await qi.dropTable('schedules').catch(() => {});
    await qi.dropTable('company_users').catch(() => {});
    await qi.dropTable('seat_locks').catch(() => {});
    await qi.dropTable('booking_items').catch(() => {});

    await qi.removeConstraint('trips', 'fk_trips_route').catch(() => {});
    await qi.removeColumn('trips', 'routeId').catch(() => {});
    await qi.dropTable('routes').catch(() => {});

    await qi.removeConstraint('payments', 'fk_payments_company').catch(() => {});
    await qi.removeConstraint('payments', 'fk_payments_booking').catch(() => {});
    await qi.removeIndex('payments', 'idx_payments_companyId').catch(() => {});
    await qi.removeColumn('payments', 'companyId').catch(() => {});

    await qi.removeConstraint('bookings', 'fk_bookings_company').catch(() => {});
    await qi.removeConstraint('bookings', 'fk_bookings_trip').catch(() => {});
    await qi.removeConstraint('bookings', 'fk_bookings_user').catch(() => {});
    await qi.removeIndex('bookings', 'idx_bookings_companyId').catch(() => {});
    await qi.removeColumn('bookings', 'companyId').catch(() => {});

    await qi.removeConstraint('trips', 'fk_trips_company_enforced').catch(() => {});
    await qi.removeConstraint('trips', 'fk_trips_bus_enforced').catch(() => {});
    await qi.removeIndex('trips', 'idx_trips_companyId').catch(() => {});
    await qi.changeColumn('trips', 'companyId', {
      type: Sequelize.INTEGER,
      allowNull: true
    }).catch(() => {});

    await qi.removeConstraint('buses', 'fk_buses_company_enforced').catch(() => {});
    await qi.removeIndex('buses', 'idx_buses_companyId').catch(() => {});
    await qi.changeColumn('buses', 'companyId', {
      type: Sequelize.INTEGER,
      allowNull: true
    }).catch(() => {});
  }
};
