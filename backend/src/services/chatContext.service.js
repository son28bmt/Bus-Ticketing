'use strict';

const moment = require('moment');
const { Op } = require('sequelize');
const {
  Trip,
  Location,
  Bus,
  Route,
} = require('../../models');

const FRONTEND_BASE =
  process.env.FRONTEND_BASE_URL ||
  (process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',')[0] : process.env.FRONTEND_URL) ||
  'http://localhost:5173';

const normalizeKeyword = (text) =>
  text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const parseMessageForTrip = (message) => {
  if (!message) {
    return null;
  }
  const normalized = message.toLowerCase();

  const routeRegex =
    /t(?:ừ|u)\s+([a-zà-ỹđ\s]+?)\s+(?:đến|den|tới|toi|về|ve)\s+([a-zà-ỹđ\s]+)/i;
  const routeMatch = normalized.match(routeRegex);

  if (!routeMatch) {
    return null;
  }

  const fromKeyword = routeMatch[1]?.trim();
  const toKeyword = routeMatch[2]?.trim();

  const dateRegex = /(ngày|day)\s+(\d{1,2}(?:[\/\-]\d{1,2})?(?:[\/\-]\d{2,4})?)/i;
  const dateMatch = normalized.match(dateRegex);

  let travelDate = null;
  if (dateMatch?.[2]) {
    const dateFormats = ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM', 'D/M', 'DD', 'D'];
    let parsed = moment(dateMatch[2], dateFormats, true);
    if (!parsed.isValid()) {
      parsed = moment(dateMatch[2], dateFormats, false);
    }
    if (parsed.isValid()) {
      if (dateMatch[2].length <= 2) {
        parsed.year(moment().year());
      }
      travelDate = parsed.startOf('day');
    }
  }

  return {
    fromKeyword,
    toKeyword,
    travelDate,
  };
};

const resolveTripQuery = (message, history = []) => {
  const current = parseMessageForTrip(message) || {};

  let routeInfo = null;
  let dateInfo = null;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i];
    if (!item || item.role !== 'user' || typeof item.content !== 'string') continue;
    const parsed = parseMessageForTrip(item.content);
    if (!parsed) continue;

    if (!routeInfo && parsed.fromKeyword && parsed.toKeyword) {
      routeInfo = parsed;
    }
    if (!dateInfo && parsed.travelDate) {
      dateInfo = parsed;
    }

    if (routeInfo && dateInfo) {
      break;
    }
  }

  const fromKeyword = current.fromKeyword || routeInfo?.fromKeyword;
  const toKeyword = current.toKeyword || routeInfo?.toKeyword;
  const travelDate = current.travelDate || dateInfo?.travelDate;

  if (!fromKeyword || !toKeyword) {
    return null;
  }

  return {
    fromKeyword,
    toKeyword,
    travelDate,
    hasDate: Boolean(current.travelDate || dateInfo?.travelDate),
    missingDateFromCurrent: !current.travelDate,
  };
};

const findLocationByKeyword = async (keyword) => {
  if (!keyword) return null;
  const locations = await Location.findAll({
    where: {
      name: {
        [Op.like]: `%${keyword}%`,
      },
    },
    limit: 1,
  });
  return locations[0] || null;
};

const buildTripContext = async ({ fromLocation, toLocation, travelDate }) => {
  const trips = await Trip.findAll({
    where: {
      departureLocationId: fromLocation.id,
      arrivalLocationId: toLocation.id,
      departureTime: {
        [Op.between]: [
          travelDate.toDate(),
          moment(travelDate).endOf('day').toDate(),
        ],
      },
      status: 'SCHEDULED',
    },
    order: [['departureTime', 'ASC']],
    limit: 3,
    include: [
      { model: Bus, attributes: ['busNumber', 'busType'] },
      { model: Route, attributes: ['distanceKm', 'durationMin'] },
      { model: Location, as: 'departureLocation', attributes: ['name', 'province'] },
      { model: Location, as: 'arrivalLocation', attributes: ['name', 'province'] },
    ],
  });

  if (!trips.length) {
    const fallbackTrips = await Trip.findAll({
      where: {
        departureLocationId: fromLocation.id,
        arrivalLocationId: toLocation.id,
        departureTime: {
          [Op.gt]: moment(travelDate).endOf('day').toDate(),
        },
        status: 'SCHEDULED',
      },
      order: [['departureTime', 'ASC']],
      limit: 3,
      include: [
        { model: Bus, attributes: ['busNumber', 'busType'] },
        { model: Location, as: 'departureLocation', attributes: ['name', 'province'] },
        { model: Location, as: 'arrivalLocation', attributes: ['name', 'province'] },
      ],
    });

    if (!fallbackTrips.length) {
      return {
        context: `TripSuggestions: Khong tim thay chuyen ${fromLocation.name} -> ${toLocation.name} vao ngay ${travelDate.format('DD/MM/YYYY')} va cung khong co chuyen sap toi.`,
        actions: [],
      };
    }

    const fallbackLines = fallbackTrips.map((trip) => {
      const depart = moment(trip.departureTime).format('HH:mm DD/MM');
      const price =
        typeof trip.basePrice === 'number'
          ? trip.basePrice.toLocaleString('vi-VN')
          : Number(trip.basePrice || 0).toLocaleString('vi-VN');
      return `- Trip ${trip.id}: khoi hanh ${depart}, gia tu ${price}d`;
    });

    return {
      context: [
        `TripSuggestions: Khong co chuyen vao ngay ${travelDate.format('DD/MM/YYYY')}. Goi y cac chuyen sap toi ${fromLocation.name} -> ${toLocation.name}:`,
        ...fallbackLines,
        'CTA_HINT: Goi y nguoi dung dat cac chuyen sap toi neu phu hop.',
      ].join('\n'),
      actions: fallbackTrips.map((trip) => ({
        type: 'link',
        label: `Đặt ${moment(trip.departureTime).format('DD/MM')}`,
        url: `${FRONTEND_BASE.replace(/\/$/, '')}/trip/${trip.id}`,
      })),
    };
  }

  const lines = trips.map((trip) => {
    const depart = moment(trip.departureTime).format('HH:mm DD/MM');
    const price =
      typeof trip.basePrice === 'number'
        ? trip.basePrice.toLocaleString('vi-VN')
        : Number(trip.basePrice || 0).toLocaleString('vi-VN');
    const seats = trip.availableSeats ?? trip.totalSeats ?? 'N/A';
    return `- Trip ${trip.id}: ${trip.departureLocation?.name || fromLocation.name} -> ${
      trip.arrivalLocation?.name || toLocation.name
    }, khoi hanh ${depart}, gia tu ${price}d, ghe trong ${seats}`;
  });

  const actions = trips.map((trip) => ({
    type: 'link',
    label: `Đặt ${moment(trip.departureTime).format('HH:mm DD/MM')}`,
    url: `${FRONTEND_BASE.replace(/\/$/, '')}/trip/${trip.id}`,
  }));

  return {
    context: [
      `TripSuggestions cho ${fromLocation.name} -> ${toLocation.name} ngay ${travelDate.format('DD/MM/YYYY')}:`,
      ...lines,
      'CTA_HINT: Neu nguoi dung muon dat, hay huong dan nhan vao nut Dat Ngay duoi day.',
    ].join('\n'),
    actions,
  };
};

const buildChatContext = async (message, history = []) => {
  try {
    const tripQuery = resolveTripQuery(message, history);
    if (!tripQuery) {
      return { context: null, actions: [] };
    }

    const fromLocation = await findLocationByKeyword(tripQuery.fromKeyword);
    const toLocation = await findLocationByKeyword(tripQuery.toKeyword);

    if (!fromLocation || !toLocation) {
      return { context: null, actions: [] };
    }

    if (!tripQuery.travelDate) {
      return {
        context: `TripQueryMissingDate: Nguoi dung hoi ve chuyen ${fromLocation.name} -> ${toLocation.name} nhung chua cung cap ngay cu the. Hay hoi lai "Ban di vao ngay nao (dd/mm)?" va doi ho tra loi truoc khi truy xuat du lieu.`,
        actions: [],
      };
    }

    return await buildTripContext({
      fromLocation,
      toLocation,
      travelDate: tripQuery.travelDate,
    });
  } catch (error) {
    console.error('[chatContext] failed to build context', error);
    return { context: null, actions: [] };
  }
};

module.exports = {
  buildChatContext,
};
