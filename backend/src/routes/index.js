const express = require('express');
const router = express.Router();

// ✅ Import route modules
const authRoutes = require('./auth.routes');
const tripRoutes = require('./trip.routes');
const bookingRoutes = require('./booking.routes');
const adminRoutes = require('./admin.routes');
const newsRoutes = require('./news.routes');
const paymentRoutes = require('./payment.routes');

console.log('🔄 Loading routes...');

// ✅ API Routes with proper patterns
router.use('/api/auth', authRoutes);
router.use('/api/trips', tripRoutes);  
router.use('/api/bookings', bookingRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/news', newsRoutes);
router.use('/api/payment', paymentRoutes);

console.log('✅ Routes loaded successfully');

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bus Ticketing API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Root endpoint
router.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Bus Ticketing API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      trips: '/api/trips', 
      bookings: '/api/bookings',
      admin: '/api/admin',
      news: '/api/news',
      payment: '/api/payment',
      health: '/api/health'
    }
  });
});

// Catch-all for API routes
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to ShanBus API',
    endpoints: {
      api: '/api',
      health: '/api/health'
    }
  });
});

module.exports = router;