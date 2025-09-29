const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  createBooking,
  getBookings,
  getBookingById,
  getBookingByCode,
  updateBookingStatus,
  cancelBooking,
  processPayment
} = require('../controllers/booking.controller');

// ✅ Protected routes with proper patterns
router.use(authenticateToken);

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/my-bookings', getBookings); // alias used by frontend
router.get('/code/:code', getBookingByCode);
router.get('/:id', getBookingById);
router.put('/:id/status', updateBookingStatus);
router.patch('/:id/cancel', cancelBooking);
router.post('/payment/:paymentId/process', (req, res, next) => {
  // Bridge: convert paymentId param to body for controller compatibility
  req.body = { ...(req.body || {}), bookingId: req.body.bookingId, paymentId: req.params.paymentId };
  return processPayment(req, res, next);
});

module.exports = router;