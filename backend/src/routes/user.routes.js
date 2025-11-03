const express = require('express');
const router = express.Router();
const { authenticateToken, requirePassenger } = require('../middlewares/auth');
const profileController = require('../controllers/user/profile.controller');
const bookingController = require('../controllers/user/booking.controller');
const paymentController = require('../controllers/user/payment.controller');
const ticketController = require('../controllers/user/ticket.controller');
const userVoucherController = require('../controllers/user/voucher.controller');

// Auth required for all user routes
router.use(authenticateToken);
router.use(requirePassenger);

// Vouchers
router.get('/vouchers', userVoucherController.listUserVouchers);
router.get('/vouchers/available', userVoucherController.listAvailableForUser);
router.post('/vouchers/:voucherId/save', userVoucherController.saveVoucher);
router.delete('/vouchers/:id', userVoucherController.removeUserVoucher);

// Profile
router.get('/me', profileController.getMyProfile);
router.get('/me/bookings', profileController.getMyBookings);

// Bookings lifecycle
router.get('/bookings', bookingController.getBookings);
router.post('/bookings', bookingController.createBooking);
router.get('/bookings/:code', bookingController.getBookingByCode);
router.post('/bookings/:id/cancel', bookingController.cancelBooking);
router.post('/bookings/:id/pay', bookingController.processPayment);

// Payments
router.post('/payments/vnpay/create-url', paymentController.createVNPayUrl);
router.get('/payments/vnpay/return', paymentController.handleVNPayReturn);
router.get('/payments/vnpay/ipn', paymentController.handleVNPayIPN);
router.get('/payments/vnpay/transaction/:orderId', paymentController.queryVNPayTransaction);
router.get('/payments/vnpay/banks', paymentController.getSupportedBanks);

// Tickets
router.get('/tickets/:bookingCode/qr', ticketController.getTicketQr);

module.exports = router;
