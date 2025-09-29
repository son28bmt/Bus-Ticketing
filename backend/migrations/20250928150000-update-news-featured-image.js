'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change featuredImage column to TEXT to accommodate base64 image data
    await queryInterface.changeColumn('news', 'featuredImage', {
      type: Sequelize.TEXT('long'),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to STRING
    await queryInterface.changeColumn('news', 'featuredImage', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};