console.log('🔄 Testing imports...');

try {
  // Test models
  const models = require('./models');
  console.log('✅ Models loaded:', Object.keys(models));
  
  // Test controllers
  const adminController = require('./src/controllers/admin.controller');
  console.log('✅ Admin controller exports:', Object.keys(adminController));
  
  const authController = require('./src/controllers/auth.controller');
  console.log('✅ Auth controller exports:', Object.keys(authController));
  
  const tripController = require('./src/controllers/trip.controller');
  console.log('✅ Trip controller exports:', Object.keys(tripController));
  
  // Test routes
  const routes = require('./src/routes');
  console.log('✅ Routes loaded successfully');
  
  console.log('🎉 All imports working correctly!');
} catch (error) {
  console.error('❌ Import error:', error);
}