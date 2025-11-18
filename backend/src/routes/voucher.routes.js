const express = require('express');
const router = express.Router();
const { authenticateTokenOptional } = require('../middlewares/auth');
const voucherController = require('../controllers/common/voucher.controller');

// Allow both guests and authenticated users; middleware attaches req.user if token exists
router.use(authenticateTokenOptional);

router.post('/validate', voucherController.validateVoucherCode);
router.get('/', voucherController.listPublicVouchers);
router.get('/available', voucherController.listAvailableVouchers);
router.get('/:code', voucherController.getVoucherByCode);

module.exports = router;



