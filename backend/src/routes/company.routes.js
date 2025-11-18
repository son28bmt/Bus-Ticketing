const express = require('express');
const router = express.Router();
const { authenticateToken, requireCompany } = require('../middlewares/auth');
const busController = require('../controllers/company/bus.controller');
const tripController = require('../controllers/company/trip.controller');
const bookingController = require('../controllers/company/booking.controller');
const reportController = require('../controllers/company/report.controller');
const paymentInvoiceController = require('../controllers/company/payment_invoice.controller');
const newsController = require('../controllers/company/news.controller');
const voucherController = require('../controllers/company/voucher.controller');
const driverController = require('../controllers/company/driver.controller');
const staffController = require('../controllers/company/staff.controller');
const tripReportController = require('../controllers/company/tripReport.controller');
const companyController = require('../controllers/company/company.controller');

// Apply authentication and company-only middleware
router.use(authenticateToken);
router.use(requireCompany);

// --- Bus Management ---
router.get('/buses', busController.getMyBuses);
router.post('/buses', busController.createBus);
router.put('/buses/:id', busController.updateBus);
router.delete('/buses/:id', busController.deleteBus);

// --- Trip Management ---
router.get('/trips', tripController.getMyTrips);
router.post('/trips', tripController.createTrip);
router.put('/trips/:id', tripController.updateTrip);
router.delete('/trips/:id', tripController.deleteTrip);
router.post('/trips/:id/cancel', tripController.cancelTrip);

// --- Driver Management ---
router.get('/drivers', driverController.getDrivers);

// --- Staff Management ---
router.get('/staff', staffController.listStaff);
router.post('/staff', staffController.createStaff);
router.put('/staff/:id', staffController.updateStaff);
router.patch('/staff/:id/status', staffController.updateStaffStatus);
router.delete('/staff/:id', staffController.deleteStaff);


// --- Booking Management ---
router.get('/bookings', bookingController.getCompanyBookings);
router.post('/bookings/:id/cancel', bookingController.approveCancellationRequest);
router.get('/profile', companyController.getCompanyProfile);
router.put('/profile', companyController.updateCompanyProfile);

// --- Payment & invoices ---
router.get('/payments/:paymentId/invoice', paymentInvoiceController.getInvoice);

// --- Reports ---
router.post('/reports', reportController.reportUser);
router.get('/reports', reportController.getReports);
router.get('/trip-reports', tripReportController.list);

// --- Voucher Management ---
router.get('/vouchers', voucherController.listCompanyVouchers);
router.post('/vouchers', voucherController.createCompanyVoucher);
router.put('/vouchers/:id', voucherController.updateCompanyVoucher);
router.patch('/vouchers/:id/status', voucherController.toggleCompanyVoucher);
router.get('/vouchers/stats/usage', voucherController.getUsageStats);

// --- News Management ---
router.get('/news', newsController.listNews);
router.get('/news/:id', newsController.getNewsById);
router.post('/news', newsController.createNews);
router.put('/news/:id', newsController.updateNews);
router.delete('/news/:id', newsController.deleteNews);

module.exports = router;


