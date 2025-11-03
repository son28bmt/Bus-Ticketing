const adminController = require('./admin.controller');

module.exports = {
  getOverviewStats: adminController.getOverviewStats,
  getRevenueStats: adminController.getRevenueStats,
  getTripStats: adminController.getTripStats,
  getRecentBookings: adminController.getRecentBookings,
  getStats: adminController.getStats,
  getRevenue: adminController.getRevenue,
  getAllBookings: adminController.getAllBookings,
  getBookingStats: adminController.getBookingStats,
  updateBookingStatus: adminController.updateBookingStatus,
};
