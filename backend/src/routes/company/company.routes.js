const express = require('express');
const router = express.Router();
const { authenticateToken, requireCompany } = require('../../middlewares/auth');
const companyController = require('../../controllers/company/company.controller');
const companyVoucherController = require('../../controllers/company/voucher.controller');
const companyNewsController = require('../../controllers/company/news.controller');

// Apply authentication and company-only middleware
router.use(authenticateToken);
router.use(requireCompany);

// --- Bus Management ---
router.get('/buses', companyController.getMyBuses);
router.post('/buses', companyController.createBus);
router.put('/buses/:id', companyController.updateBus);
router.delete('/buses/:id', companyController.deleteBus);

// --- Trip Management ---
router.get('/trips', companyController.getMyTrips);
router.post('/trips', companyController.createTrip);
router.put('/trips/:id', companyController.updateTrip);
router.delete('/trips/:id', companyController.deleteTrip);

// --- Booking Management ---
router.get('/bookings', companyController.getCompanyBookings);

// --- Reports ---
router.post('/reports', companyController.reportUser);
router.get('/reports', companyController.getReports);

// --- Voucher Management ---
router.get('/vouchers', companyVoucherController.listCompanyVouchers);
router.post('/vouchers', companyVoucherController.createCompanyVoucher);
router.put('/vouchers/:id', companyVoucherController.updateCompanyVoucher);
router.patch('/vouchers/:id/status', companyVoucherController.toggleCompanyVoucher);
router.get('/vouchers/stats/usage', companyVoucherController.getUsageStats);

// --- News Management ---
router.get('/news', companyNewsController.listNews);
router.get('/news/:id', companyNewsController.getNewsById);
router.post('/news', companyNewsController.createNews);
router.put('/news/:id', companyNewsController.updateNews);
router.delete('/news/:id', companyNewsController.deleteNews);

module.exports = router;
