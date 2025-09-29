const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// ✅ Import database connection
const db = require('../models');

// ✅ Import routes
const routes = require('./routes');

const app = express();

// Middleware
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Note: Database connection is verified at startup in server.js

// ✅ Routes - Use routes directly
app.use('/', routes);

// ✅ 404 handler - FIX: Use proper route pattern
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/health',
      '/api/auth',
      '/api/trips',
      '/api/bookings',
      '/api/admin'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;