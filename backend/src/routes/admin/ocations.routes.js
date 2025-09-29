const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../../middlewares/auth');
const {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../../controllers/admin/location.controller');

// Apply middleware
router.use(authenticateToken);
router.use(requireAdmin);

// Location routes
router.get('/', getLocations);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

module.exports = router;