'use strict';

const { Op } = require('sequelize');
const {
  TripReport,
  Trip,
  Driver,
  User,
  Location,
  Bus,
} = require('../../../models');

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
};

const shapeReport = (report) => {
  const plain = report.get({ plain: true });
  const trip = plain.trip || {};
  const driver = plain.driver || {};
  const driverUser = driver.user || {};

  const departureName = trip.departureLocation?.name || null;
  const arrivalName = trip.arrivalLocation?.name || null;

  return {
    id: plain.id,
    note: plain.note,
    createdAt: plain.createdAt,
    trip: {
      id: trip.id || plain.tripId,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      routeLabel: departureName && arrivalName ? `${departureName} → ${arrivalName}` : null,
      busNumber: trip.bus?.busNumber || null,
    },
    driver: driver.id
      ? {
          id: driver.id,
          name: driverUser.name || driver.fullName || `Tài xế #${driver.id}`,
          phone: driverUser.phone || driver.phone || null,
        }
      : null,
  };
};

const buildSummary = (items) => {
  const driverMap = new Map();
  const routeMap = new Map();
  let lastReportAt = null;

  items.forEach((item) => {
    const driverKey = item.driver?.id ?? 'unassigned';
    if (!driverMap.has(driverKey)) {
      driverMap.set(driverKey, {
        driverId: item.driver?.id ?? null,
        name: item.driver?.name || 'Chưa phân công',
        count: 0,
      });
    }
    driverMap.get(driverKey).count += 1;

    const routeKey = item.trip?.routeLabel || 'Chưa xác định tuyến';
    if (!routeMap.has(routeKey)) {
      routeMap.set(routeKey, {
        route: routeKey,
        count: 0,
      });
    }
    routeMap.get(routeKey).count += 1;

    if (!lastReportAt || new Date(item.createdAt) > new Date(lastReportAt)) {
      lastReportAt = item.createdAt;
    }
  });

  const sortByCount = (arr) => arr.sort((a, b) => b.count - a.count);

  return {
    totalReports: items.length,
    topDrivers: sortByCount(Array.from(driverMap.values())).slice(0, 5),
    topRoutes: sortByCount(Array.from(routeMap.values())).slice(0, 5),
    lastReportAt,
  };
};

exports.list = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Missing companyId' });
    }

    const { from, to, driverId, limit = 200 } = req.query || {};

    const where = { companyId };
    const startDate = parseDate(from);
    const endDate = parseDate(to, true);

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { [Op.gte]: startDate } : {}),
        ...(endDate ? { [Op.lte]: endDate } : {}),
      };
    }

    if (driverId) {
      const numericDriverId = Number(driverId);
      if (!Number.isNaN(numericDriverId)) {
        where.driverId = numericDriverId;
      }
    }

    const numericLimit = Number(limit);
    const effectiveLimit = Number.isFinite(numericLimit) ? Math.min(Math.max(numericLimit, 10), 500) : 200;

    const reports = await TripReport.findAll({
      where,
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
            { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
            { model: Bus, as: 'bus', attributes: ['id', 'busNumber'] },
          ],
        },
        {
          model: Driver,
          as: 'driver',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: effectiveLimit,
    });

    const items = reports.map(shapeReport);
    const summary = buildSummary(items);

    return res.json({
      success: true,
      data: {
        items,
        summary,
      },
    });
  } catch (error) {
    console.error('[tripReport] list error', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách báo cáo chuyến',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
