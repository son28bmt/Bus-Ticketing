const adminNewsController = require('../admin/news.controller');

// Company news controller simply reuses the shared admin implementation.
// All company-specific guards (companyId scoping, permission checks, etc.)
// are handled inside the admin controller based on req.user role.

module.exports = {
  listNews: adminNewsController.getAllNews,
  getNewsById: adminNewsController.getNewsById,
  createNews: adminNewsController.createNews,
  updateNews: adminNewsController.updateNews,
  deleteNews: adminNewsController.deleteNews
};

