const { syncDatabase } = require('./config/db.js');
const seedData = require('./src/seeders/demo-data.js');

const runSeed = async () => {
  try {
    console.log('🔄 Starting database sync and seed...');
    
    // Sync database trước
    await syncDatabase();
    
    // Chạy seed data
    await seedData();
    
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

runSeed();
