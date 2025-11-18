const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const routes = require('./routes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Middleware
app.use(morgan('combined'));

// Flexible CORS: allow multiple origins and common dev tunnel domains
const rawOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Allow common tunneling domains (Cloudflare, LocalTunnel, Ngrok, VS Code Dev Tunnels)
const allowedRegex = [
  /\.trycloudflare\.com$/,
  /\.loca\.lt$/,
  /\.ngrok(-free)?\.app$/,
  /\.devtunnels\.ms$/,
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Allow non-browser clients or same-origin
      const isAllowed =
        allowedOrigins.includes(origin) || allowedRegex.some((rx) => rx.test(origin));
      if (isAllowed) return cb(null, true);
      console.warn('[CORS] Blocked origin:', origin, '\n[Allowed origins]:', allowedOrigins);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use('/uploads', express.static('uploads'));

// Upload endpoints
app.use('/api/upload', uploadRoutes);

// API routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/health',
      '/api/auth',
      '/api/trips',
      '/api/bookings',
      '/api/admin',
      '/api/chat'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

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
