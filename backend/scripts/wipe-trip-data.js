'use strict';

require('dotenv').config();

const {
  sequelize,
  PaymentLog,
  VNPayTransaction,
  Invoice,
  Payment,
  BookingItem,
  SeatLock,
  Booking,
  Trip
} = require('../models');

const run = async () => {
  const cleanupOrder = [
    { name: 'PaymentLog', model: PaymentLog },
    { name: 'VNPayTransaction', model: VNPayTransaction },
    { name: 'Invoice', model: Invoice },
    { name: 'Payment', model: Payment },
    { name: 'BookingItem', model: BookingItem },
    { name: 'SeatLock', model: SeatLock },
    { name: 'Booking', model: Booking },
    { name: 'Trip', model: Trip }
  ];

  const report = [];

  const transaction = await sequelize.transaction();
  try {
    for (const entry of cleanupOrder) {
      const { name, model } = entry;
      if (!model) {
        report.push(`${name}: model not registered, skipped.`);
        continue;
      }

      const deleted = await model.destroy({
        where: {},
        transaction
      });
      report.push(`${name}: deleted ${deleted} record(s).`);
    }

    await transaction.commit();
    console.log('✅ Trip-related data wiped successfully.');
    report.forEach((line) => console.log(' -', line));
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Failed to wipe trip data:', error);
    process.exit(1);
  }
};

run();

