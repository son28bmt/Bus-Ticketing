'use strict';

const seatNumberPadLength = (totalSeats) => {
  const safeTotal = Number(totalSeats) || 0;
  return Math.max(2, String(Math.max(safeTotal, 0)).length);
};

const normalizeSeatNumber = (seatNumber, digits) => {
  if (seatNumber == null) {
    return '';
  }
  const trimmed = String(seatNumber).trim();
  const numeric = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(numeric)) {
    return numeric.toString().padStart(digits, '0');
  }
  return trimmed.toUpperCase();
};

const seatTypeFromBusType = (busType = '') => {
  const normalized = String(busType || '').toUpperCase();
  if (normalized.includes('SLEEPER')) {
    return 'SLEEPER';
  }
  if (normalized.includes('VIP') || normalized.includes('LIMOUSINE') || normalized.includes('DELUXE')) {
    return 'VIP';
  }
  return 'STANDARD';
};

const multiplierFromSeatType = (seatType) => {
  switch (seatType) {
    case 'VIP':
      return 1.2;
    case 'SLEEPER':
      return 1.1;
    default:
      return 1;
  }
};

const buildSeatRecord = (bus, seatNumber, seatType) => ({
  busId: bus.id,
  seatNumber,
  seatType,
  priceMultiplier: multiplierFromSeatType(seatType),
  isActive: true
});

const ensureSeatsForBus = async (SeatModel, bus, options = {}) => {
  const { transaction, resetExisting = false } = options;
  const totalSeats = Number(bus.totalSeats) || 0;

  if (totalSeats <= 0) {
    if (resetExisting) {
      await SeatModel.destroy({ where: { busId: bus.id }, transaction });
    }
    return { created: 0 };
  }

  const digits = seatNumberPadLength(totalSeats);

  if (resetExisting) {
    await SeatModel.destroy({ where: { busId: bus.id }, transaction });
  }

  const existingSeats = await SeatModel.findAll({
    where: { busId: bus.id },
    attributes: ['seatNumber'],
    transaction
  });

  const existingSet = new Set(existingSeats.map((seat) => normalizeSeatNumber(seat.seatNumber, digits)));
  const seatType = seatTypeFromBusType(bus.busType);
  const recordsToCreate = [];

  for (let index = 1; index <= totalSeats; index += 1) {
    const seatNumber = index.toString().padStart(digits, '0');
    if (!existingSet.has(seatNumber)) {
      recordsToCreate.push(buildSeatRecord(bus, seatNumber, seatType));
    }
  }

  if (recordsToCreate.length > 0) {
    await SeatModel.bulkCreate(recordsToCreate, { transaction });
  }

  return { created: recordsToCreate.length };
};

module.exports = {
  ensureSeatsForBus,
  seatTypeFromBusType
};

