const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const {
  // Stats functions
  getOverviewStats,
  getRevenueStats, 
  getTripStats,
  getRecentBookings,
  
  // Management functions
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripDetails,
  getAllBookings,
  updateBookingStatus,
  getBookingStats,
  
  // Legacy aliases
  getStats,
  getRevenue
} = require('../controllers/admin.controller');
const { getBuses, createBus, updateBus, deleteBus } = require('../controllers/admin/bus.controller');
const { 
  getAllNews, 
  getNewsById, 
  createNews, 
  updateNews, 
  deleteNews, 
  getNewsStats 
} = require('../controllers/news.controller');

// ✅ Apply authentication to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// ✅ Dashboard stats routes (matching frontend API calls)
router.get('/stats/overview', getOverviewStats);
router.get('/stats/revenue', getRevenueStats);
router.get('/stats/trips', getTripStats);
router.get('/activities/bookings', getRecentBookings);

// ✅ Legacy stats routes (if still used)
router.get('/stats', getStats);
router.get('/revenue', getRevenue);

// User management
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Trip management
router.get('/trips', getAllTrips);
router.post('/trips', createTrip);
router.put('/trips/:id', updateTrip);
router.delete('/trips/:id', deleteTrip);
router.get('/trips/:id/details', getTripDetails);

// Bus management
router.get('/buses', getBuses);
router.post('/buses', createBus);
router.put('/buses/:id', updateBus);
router.delete('/buses/:id', deleteBus);

// Booking stats (place before listing route)
router.get('/bookings/stats', getBookingStats);
// Booking management
router.get('/bookings', getAllBookings);
router.put('/bookings/:id/status', updateBookingStatus);

// News management
router.get('/news', getAllNews);
router.get('/news/stats', getNewsStats);
router.get('/news/:id', getNewsById);
router.post('/news', createNews);
router.put('/news/:id', updateNews);
router.delete('/news/:id', deleteNews);

module.exports = router;