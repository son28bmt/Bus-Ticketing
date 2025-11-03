const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, authorize } = require('../middlewares/auth');
const reportController = require('../controllers/admin/report.controller');
const adminUserController = require('../controllers/admin/user.controller');
const adminTripController = require('../controllers/admin/trip.controller');
const adminBusController = require('../controllers/admin/bus.controller');
const adminCompanyController = require('../controllers/admin/company.controller');
const newsController = require('../controllers/admin/news.controller');
const locationController = require('../controllers/admin/location.controller');
const adminVoucherController = require('../controllers/admin/voucher.controller');
const { PERMISSIONS } = require('../constants/permissions');

// ✅ Apply authentication to all admin routes
router.use(authenticateToken);
// Allow ADMIN accounts to enter admin area; per-route authorize will limit actions
router.use(requireAdmin);

// ✅ Dashboard stats routes (matching frontend API calls)
router.get('/stats/overview', reportController.getOverviewStats);
router.get('/stats/revenue', reportController.getRevenueStats);
router.get('/stats/trips', reportController.getTripStats);
router.get('/activities/bookings', reportController.getRecentBookings);

// ✅ Legacy stats routes (if still used)
router.get('/stats', reportController.getStats);
router.get('/revenue', reportController.getRevenue);

// User manag../controllers/admin/admin.controllerers)
router.get('/users', authorize(PERMISSIONS.USERS_VIEW), adminUserController.getAllUsers);
router.post('/users', authorize(PERMISSIONS.USERS_MANAGE), adminUserController.createUser);
router.put('/users/:id', authorize(PERMISSIONS.USERS_MANAGE), adminUserController.updateUser);
router.delete('/users/:id', authorize(PERMISSIONS.USERS_MANAGE), adminUserController.deleteUser);

// Company directory
router.get('/companies', authorize(PERMISSIONS.USERS_VIEW), adminCompanyController.getCompanies);
router.post('/companies', authorize(PERMISSIONS.USERS_MANAGE), adminCompanyController.createCompany);
// Trip management
router.get('/trips', adminTripController.getAllTrips);
router.post('/trips', adminTripController.createTrip);
router.put('/trips/:id', adminTripController.updateTrip);
router.delete('/trips/:id', adminTripController.deleteTrip);
router.get('/trips/:id/details', adminTripController.getTripDetails);

// Bus management
router.get('/buses', adminBusController.getBuses);
router.post('/buses', adminBusController.createBus);
router.put('/buses/:id', adminBusController.updateBus);
router.delete('/buses/:id', adminBusController.deleteBus);

// Booking stats (place before listing route)
router.get('/bookings/stats', reportController.getBookingStats);
// Booking management
router.get('/bookings', reportController.getAllBookings);
router.put('/bookings/:id/status', reportController.updateBookingStatus);

// Voucher management
router.get('/vouchers', authorize(PERMISSIONS.VOUCHERS_VIEW), adminVoucherController.listVouchers);
router.get('/vouchers/:id', authorize(PERMISSIONS.VOUCHERS_VIEW), adminVoucherController.getVoucherById);
router.post('/vouchers', authorize(PERMISSIONS.VOUCHERS_MANAGE_ANY), adminVoucherController.createVoucher);
router.put('/vouchers/:id', authorize(PERMISSIONS.VOUCHERS_MANAGE_ANY), adminVoucherController.updateVoucher);
router.patch('/vouchers/:id/status', authorize(PERMISSIONS.VOUCHERS_MANAGE_ANY), adminVoucherController.toggleVoucher);
router.delete('/vouchers/:id', authorize(PERMISSIONS.VOUCHERS_MANAGE_ANY), adminVoucherController.archiveVoucher);

// News management
router.get('/news', newsController.getAllNews);
router.get('/news/stats', newsController.getNewsStats);
router.get('/news/:id', newsController.getNewsById);
router.post('/news', newsController.createNews);
router.put('/news/:id', newsController.updateNews);
router.delete('/news/:id', newsController.deleteNews);

// Location management (Admin only)
router.get('/locations', requireAdmin, locationController.getLocations);
router.post('/locations', requireAdmin, locationController.createLocation);
router.put('/locations/:id', requireAdmin, locationController.updateLocation);
router.delete('/locations/:id', requireAdmin, locationController.deleteLocation);

module.exports = router;
