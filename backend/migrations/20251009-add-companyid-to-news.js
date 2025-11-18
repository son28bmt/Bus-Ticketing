"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add companyId column to news table
    await queryInterface.addColumn('news', 'companyId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'bus_companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('news', 'companyId');
  }
};
