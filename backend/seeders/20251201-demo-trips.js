'use strict';

const { Op } = require('sequelize');

const COMPANY_IDS = [1, 2];
const START_DATE = new Date(Date.UTC(2025, 11, 15, 0, 0, 0)); // 15/12/2025 UTC
const END_DATE = new Date(Date.UTC(2026, 0, 30, 23, 59, 59)); // 30/01/2026 UTC

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    const [buses] = await sequelize.query(
      'SELECT id, companyId, totalSeats FROM buses WHERE companyId IN (:companyIds) ORDER BY companyId, id',
      { replacements: { companyIds: COMPANY_IDS } }
    );

    if (!buses.length) {
      throw new Error('No buses found for companyIds 1 and 2. Please seed buses first.');
    }

    const busesByCompany = COMPANY_IDS.reduce((acc, companyId) => {
      acc[companyId] = buses.filter((bus) => bus.companyId === companyId);
      if (!acc[companyId].length) {
        throw new Error(`No buses found for companyId ${companyId}.`);
      }
      return acc;
    }, {});

    const [routes] = await sequelize.query(
      'SELECT id, fromLocationId, toLocationId FROM routes ORDER BY id'
    );

    if (!routes.length) {
      throw new Error('No routes available. Please seed routes before running this seeder.');
    }

    const routeCount = routes.length;

    const journeyTemplates = [
      { depHour: 7, depMinute: 15, minDurationHours: 26, maxDurationHours: 40, minPrice: 220000, maxPrice: 420000 },
      { depHour: 14, depMinute: 45, minDurationHours: 18, maxDurationHours: 28, minPrice: 250000, maxPrice: 460000 },
      { depHour: 21, depMinute: 5, minDurationHours: 24, maxDurationHours: 36, minPrice: 280000, maxPrice: 520000 },
    ];

    const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const trips = [];
    const createdAt = new Date();
    const updatedAt = new Date();

    let dayCursor = new Date(START_DATE.getTime());
    const maxTrips = 180; // between 100 and 200 as requested
    const routeIndexByCompany = COMPANY_IDS.reduce((acc, id) => {
      acc[id] = 0;
      return acc;
    }, {});
    const busIndexByCompany = COMPANY_IDS.reduce((acc, id) => {
      acc[id] = 0;
      return acc;
    }, {});

    while (dayCursor <= END_DATE && trips.length < maxTrips) {
      COMPANY_IDS.forEach((companyId) => {
        const availableBuses = busesByCompany[companyId];

        journeyTemplates.forEach((template, tplIdx) => {
          if (trips.length >= maxTrips) {
            return;
          }

          const bus = availableBuses[busIndexByCompany[companyId] % availableBuses.length];
          busIndexByCompany[companyId] += 1;

          const route = routes[(routeIndexByCompany[companyId] + tplIdx) % routeCount];
          routeIndexByCompany[companyId] = (routeIndexByCompany[companyId] + 1) % routeCount;

          const departure = new Date(
            Date.UTC(
              dayCursor.getUTCFullYear(),
              dayCursor.getUTCMonth(),
              dayCursor.getUTCDate(),
              template.depHour,
              template.depMinute,
              0
            )
          );

          const durationHours = randBetween(template.minDurationHours, template.maxDurationHours);
          const arrival = new Date(departure.getTime() + durationHours * 60 * 60 * 1000);

          const basePrice =
            randBetween(Math.ceil(template.minPrice / 10000), Math.ceil(template.maxPrice / 10000)) * 10000;

          const totalSeats = bus.totalSeats || 40;

          trips.push({
            companyId,
            busId: bus.id,
            routeId: route.id,
            departureLocationId: route.fromLocationId,
            arrivalLocationId: route.toLocationId,
            departureTime: departure,
            arrivalTime: arrival,
            basePrice,
            status: 'SCHEDULED',
            totalSeats,
            availableSeats: totalSeats,
            createdAt,
            updatedAt,
          });
        });
      });

      dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    }

    if (!trips.length) {
      throw new Error('No trips generated. Please check available buses/routes.');
    }

    await queryInterface.bulkInsert('trips', trips, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'trips',
      {
        companyId: { [Op.in]: COMPANY_IDS },
        departureTime: {
          [Op.between]: [new Date(START_DATE), new Date(END_DATE)],
        },
      },
      {}
    );
  },
};
