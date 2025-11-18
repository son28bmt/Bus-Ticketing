const companyController = require('./company.controller');

module.exports = {
  getMyBuses: companyController.getMyBuses,
  createBus: companyController.createBus,
  updateBus: companyController.updateBus,
  deleteBus: companyController.deleteBus,
};
