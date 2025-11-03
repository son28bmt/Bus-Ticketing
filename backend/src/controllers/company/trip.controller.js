const companyController = require('./company.controller');

module.exports = {
  getMyTrips: companyController.getMyTrips,
  createTrip: companyController.createTrip,
  updateTrip: companyController.updateTrip,
  deleteTrip: companyController.deleteTrip,
};
