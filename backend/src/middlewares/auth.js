const jwt = require('jsonwebtoken');
const { ROLES } = require('../constants/roles');
const authorize = require('./authorize');

const authenticateTokenOptional = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice('Bearer '.length);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = payload;
  } catch (error) {
    console.warn('[auth] optional token verification failed:', error.message);
  }

  return next();
};

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing authorization token' });
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = payload;

    if (req.path && req.path.startsWith('/api/admin')) {
      console.debug('[auth] admin request user', {
        id: payload?.id,
        role: payload?.role,
        companyId: payload?.companyId
      });
    }

    return next();
  } catch (error) {
    console.error('[auth] authenticateToken error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      requiredRole: ROLES.ADMIN,
      userRole: req.user?.role
    });
  }
  return next();
};

const requireAdminOrCompany = (req, res, next) => {
  const allowed = [ROLES.ADMIN, ROLES.COMPANY];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or company access required',
      requiredRole: allowed.join('|'),
      userRole: req.user?.role
    });
  }
  return next();
};

const requireCompany = (req, res, next) => {
  if (req.user?.role !== ROLES.COMPANY) {
    return res.status(403).json({
      success: false,
      message: 'Company access required',
      requiredRole: ROLES.COMPANY,
      userRole: req.user?.role
    });
  }

  if (req.user?.companyId == null) {
    return res.status(400).json({ success: false, message: 'Missing companyId for company account' });
  }

  return next();
};

const requirePassenger = (req, res, next) => {
  if (req.user?.role !== ROLES.PASSENGER) {
    return res.status(403).json({
      success: false,
      message: 'Passenger access required',
      requiredRole: ROLES.PASSENGER,
      userRole: req.user?.role
    });
  }
  return next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePassenger,
  requireAdminOrCompany,
  requireCompany,
  authorize,
  authenticateTokenOptional
};
