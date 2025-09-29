const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  createVNPayUrl,
  handleVNPayReturn,
  handleVNPayIPN,
  queryVNPayTransaction,
  getSupportedBanks,
  getVNPayTransactions,
  getInvoice
} = require('../controllers/payment.controller');

// ✅ VNPay routes

// Lấy danh sách ngân hàng hỗ trợ (public)
router.get('/vnpay/banks', getSupportedBanks);

// Tạo URL thanh toán VNPay (protected)
router.post('/vnpay/create-url', authenticateToken, createVNPayUrl);

// Xử lý return từ VNPay (public - VNPay sẽ redirect user về đây)
router.get('/vnpay/return', handleVNPayReturn);

// Xử lý IPN từ VNPay (public - VNPay server gửi notification)
router.post('/vnpay/ipn', handleVNPayIPN);

// Tra cứu trạng thái giao dịch VNPay (protected)
router.get('/vnpay/transaction/:orderId', authenticateToken, queryVNPayTransaction);

// Lấy lịch sử giao dịch VNPay của user (protected)
router.get('/vnpay/transactions', authenticateToken, getVNPayTransactions);

// Lấy hóa đơn thanh toán (protected)
router.get('/invoice/:paymentId', authenticateToken, getInvoice);

module.exports = router;