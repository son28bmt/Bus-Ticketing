const { ROLE_PERMISSIONS, ROLES } = require('../constants/permissions');

/**
 * authorize(permission, options)
 * - permission: string permission name
 * - options.ownerField: optional DB field name that represents ownerId on resource (e.g., 'companyId' or 'userId')
 * - options.getResource: optional async function (req) => resource used to resolve owner
 */
const authorize = (permission, options = {}) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // Admin short-circuit
      if (user.role === ROLES.ADMIN) return next();

      const required = Array.isArray(permission) ? permission : [permission];
      const perms = ROLE_PERMISSIONS[user.role] || [];
      const hasPermission = required.every((perm) => perms.includes(perm));
      if (hasPermission) return next();

      // Owner check: if options.getResource provided, resolve and compare owner field
      if (options.getResource && options.ownerField) {
        const resource = await options.getResource(req);
        if (resource && resource[options.ownerField]) {
          // resource owner matches user's id or companyId
          if (resource[options.ownerField] === user.id || resource[options.ownerField] === user.companyId) {
            return next();
          }
        }
      }

      return res.status(403).json({ success: false, message: 'Forbidden: missing permission' });
    } catch (error) {
      console.error('Authorize error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
};

module.exports = authorize;
