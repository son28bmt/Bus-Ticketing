/**
 * Script placeholder for populating sample data.
 * Run with: node scripts/sample-data.js
 */
const { syncDatabase } = require('../config/db');

const run = async () => {
  try {
    const db = await syncDatabase();
    console.log('[sample-data] Database is ready. Add your demo inserts here.');
    // TODO: insert sample entities, e.g.:
    // await db.BusCompany.create({ name: 'Demo Bus', code: 'DEMO' });
    process.exit(0);
  } catch (error) {
    console.error('[sample-data] Failed to prepare sample data', error);
    process.exit(1);
  }
};

run();
