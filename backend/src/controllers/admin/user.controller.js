const adminController = require('./admin.controller');

module.exports = {
  getAllUsers: adminController.getAllUsers,
  createUser: adminController.createUser,
  updateUser: adminController.updateUser,
  deleteUser: adminController.deleteUser,
};
