const adminController = require('./admin.controller');


module.exports = {
  getAllTrips: adminController.getAllTrips,
  createTrip: adminController.createTrip,
  updateTrip: adminController.updateTrip,
  deleteTrip: adminController.deleteTrip,
  getTripDetails: adminController.getTripDetails,
};
