'use strict';

const BUS_DEFINITIONS = [
  { companyId: 1, busNumber: 'HN-EXP-01', busType: 'STANDARD', totalSeats: 40, capacity: 40, facilities: ['WiFi', 'Water', 'Blanket'] },
  { companyId: 1, busNumber: 'HN-EXP-02', busType: 'STANDARD', totalSeats: 40, capacity: 40, facilities: ['WiFi', 'Snacks'] },
  { companyId: 1, busNumber: 'HN-EXP-03', busType: 'STANDARD', totalSeats: 40, capacity: 40, facilities: ['Massage Seats', 'USB Charging'] },
  { companyId: 2, busNumber: 'SG-FAST-01', busType: 'STANDARD', totalSeats: 40, capacity: 40, facilities: ['WiFi', 'Blanket', 'Snack'] },
  { companyId: 2, busNumber: 'SG-FAST-02', busType: 'STANDARD', totalSeats: 40, capacity: 40, facilities: ['Air Conditioning', 'Television'] },
  { companyId: 2, busNumber: 'SG-FAST-03', busType: 'STANDARD', totalSeats: 40, capacity: 40, facilities: ['Massage Seats', 'WiFi', 'Water'] },
];

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    const [companies] = await sequelize.query(
      'SELECT id FROM bus_companies WHERE id IN (:companyIds)',
      { replacements: { companyIds: [1, 2] } }
    );

    const missing = [1, 2].filter((id) => !companies.some((c) => c.id === id));
    if (missing.length) {
      throw new Error(`Missing bus companies with ids: ${missing.join(', ')}. Please seed companies first.`);
    }

    const [existing] = await sequelize.query(
      'SELECT busNumber FROM buses WHERE busNumber IN (:busNumbers)',
      { replacements: { busNumbers: BUS_DEFINITIONS.map((bus) => bus.busNumber) } }
    );

    const existingNumbers = new Set(existing.map((row) => row.busNumber));
    const timestamp = new Date();

    const busesToInsert = BUS_DEFINITIONS
      .filter((bus) => !existingNumbers.has(bus.busNumber))
      .map((bus) => ({
        companyId: bus.companyId,
        busNumber: bus.busNumber,
        busType: bus.busType,
        totalSeats: bus.totalSeats,
        capacity: bus.capacity,
        facilities: JSON.stringify(bus.facilities ?? []),
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

    if (!busesToInsert.length) {
      return;
    }

    await queryInterface.bulkInsert('buses', busesToInsert, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'buses',
      { busNumber: BUS_DEFINITIONS.map((bus) => bus.busNumber) },
      {}
    );
  },
};
