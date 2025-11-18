const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/user/auth.controller');

// ✅ Registration route - Validation trong controller
router.post('/register', register);

// ✅ Login route
router.post('/login', login);

// ✅ Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
