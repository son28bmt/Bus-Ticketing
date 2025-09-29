const express = require('express');
const router = express.Router();
const {
  searchTrips,
  getLocations,
  getTripById,
  getFeaturedTrips
} = require('../controllers/trip.controller');

// ✅ Routes with proper order
router.get('/locations', getLocations);
router.get('/featured', getFeaturedTrips);
router.get('/search', searchTrips);  // GET instead of POST for easier URL sharing
router.get('/:id', getTripById);

module.exports = router;