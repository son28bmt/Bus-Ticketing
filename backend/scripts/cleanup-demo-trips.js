require('dotenv').config();
const { Trip, Location, Booking, Bus } = require('../models');

(async () => {
  try {
    console.log('🔄 Cleaning up demo trips with invalid locations...');

    const trips = await Trip.findAll({ raw: true });
    let deleted = 0;

    for (const t of trips) {
      const hasIds = t.departureLocationId && t.arrivalLocationId;
      if (!hasIds) {
        await Trip.destroy({ where: { id: t.id } });
        deleted++;
        continue;
      }
      const dep = await Location.findByPk(t.departureLocationId);
      const arr = await Location.findByPk(t.arrivalLocationId);
      if (!dep || !arr) {
        await Trip.destroy({ where: { id: t.id } });
        deleted++;
      }
    }

    console.log(`✅ Removed ${deleted} invalid trip(s).`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
})();
