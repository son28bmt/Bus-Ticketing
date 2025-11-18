const userAuth = require('../user/auth.controller');

module.exports = {
  register: userAuth.register,
  login: userAuth.login,
  getProfile: userAuth.getProfile,
  updateProfile: userAuth.updateProfile,
  changePassword: userAuth.changePassword,
};
