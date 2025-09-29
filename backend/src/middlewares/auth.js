const jwt = require('jsonwebtoken');
const { User } = require('../../models');

// ✅ Main authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'Không có token xác thực' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Token không hợp lệ' 
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = payload;
    next();
    
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ 
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn' 
    });
  }
};

// ✅ Admin role middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập',
      requiredRole: 'ADMIN',
      userRole: req.user?.role
    });
  }
  next();
};

// ✅ Passenger role middleware
const requirePassenger = (req, res, next) => {
  if (req.user?.role !== 'PASSENGER') {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập',
      requiredRole: 'PASSENGER',
      userRole: req.user?.role
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePassenger
};