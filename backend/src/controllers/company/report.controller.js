const companyController = require('./company.controller');

module.exports = {
  reportUser: companyController.reportUser,
  getReports: companyController.getReports,
};
