const app = require('./app');
const db = require('../models');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('🔄 Starting server...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', PORT);
    
    // Test database connection (no sync to avoid schema changes in production)
    try {
      await db.sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      console.log('⚠️  Server will start without database connection');
    }
    
    // List all available models
    console.log('📊 Available models:', Object.keys(db));
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {  // ✅ Listen on all interfaces
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 API available at: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 Admin stats: http://localhost:${PORT}/api/admin/stats/overview`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });
    
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  try {
    if (db?.sequelize) {
      await db.sequelize.close();
      console.log('✅ Database connection closed.');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  try {
    if (db?.sequelize) {
      await db.sequelize.close();
      console.log('✅ Database connection closed.');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
  process.exit(0);
});