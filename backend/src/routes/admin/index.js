const express = require('express');
const router = express.Router();

// Import sub-routes
const statsRoutes = require('./stats.routes');
const locationRoutes = require('./locations.routes');
const companyRoutes = require('./companies.routes');
const busRoutes = require('./buses.routes');
const tripRoutes = require('./trips.routes');

// Mount routes
router.use('/stats', statsRoutes);
router.use('/locations', locationRoutes);
router.use('/companies', companyRoutes);
router.use('/buses', busRoutes);
router.use('/trips', tripRoutes);

module.exports = router;