const { Bus, Trip, Booking, BusCompany, User, UserReport, Location, Route, Seat, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const { ensureSeatsForBus } = require('../../utils/seat-helper');

const resolveRoute = async ({ fromLocationId, toLocationId, basePrice, departureTime, arrivalTime, transaction }) => {
  if (!fromLocationId || !toLocationId) {
    throw new Error('Missing route locations');
  }

  const durationMinutes =
    departureTime instanceof Date &&
    arrivalTime instanceof Date &&
    Number.isFinite(departureTime.getTime()) &&
    Number.isFinite(arrivalTime.getTime())
      ? Math.max(0, Math.round((arrivalTime.getTime() - departureTime.getTime()) / 60000))
      : null;

  const [route, created] = await Route.findOrCreate({
    where: { fromLocationId, toLocationId },
    defaults: {
      basePrice,
      distanceKm: null,
      durationMin: durationMinutes
    },
    transaction
  });

  const updates = {};
  if (!created) {
    if (basePrice != null && Number(route.basePrice) !== Number(basePrice)) {
      updates.basePrice = basePrice;
    }
    if (durationMinutes != null && route.durationMin !== durationMinutes) {
      updates.durationMin = durationMinutes;
    }
  }

  if (Object.keys(updates).length > 0) {
    await route.update(updates, { transaction });
  }

  return route;
};

// ========================= BUS MANAGEMENT =========================
exports.getMyBuses = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing companyId' });
    const buses = await Bus.findAll({ where: { companyId }, include: [{ model: BusCompany, as: 'company', attributes: ['id','name','code'] }] });
    res.json({ success: true, data: buses });
  } catch (error) {
    console.error('❌ getMyBuses error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete trip', error: error.message });
  }
};

exports.createBus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Missing companyId' });
    }

    const { busNumber, busType, totalSeats, capacity, facilities, isActive } = req.body;

    if (!busNumber || !busType || !totalSeats) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Missing required bus information' });
    }

    const parsedTotalSeats = parseInt(totalSeats, 10);
    if (Number.isNaN(parsedTotalSeats) || parsedTotalSeats <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid seat count' });
    }

    const parsedCapacity = capacity != null ? parseInt(capacity, 10) : parsedTotalSeats;
    const normalizedFacilities = Array.isArray(facilities)
      ? facilities
      : typeof facilities === 'string'
        ? facilities.split(',').map((item) => item.trim()).filter(Boolean)
        : [];

    const bus = await Bus.create(
      {
        companyId,
        busNumber: String(busNumber).trim(),
        busType,
        totalSeats: parsedTotalSeats,
        capacity: Number.isNaN(parsedCapacity) ? parsedTotalSeats : parsedCapacity,
        facilities: normalizedFacilities,
        isActive: typeof isActive === 'boolean' ? isActive : true
      },
      { transaction }
    );

    await ensureSeatsForBus(Seat, bus, { transaction, resetExisting: true });

    await transaction.commit();

    res.status(201).json({ success: true, message: 'Tao xe thanh cong', data: bus });
  } catch (error) {
    await transaction.rollback();
    console.error('createBus error:', error);
    res.status(500).json({ success: false, message: 'Khong the tao xe', error: error.message });
  }
};

exports.updateBus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const companyId = req.user.companyId;
    const bus = await Bus.findOne({ where: { id: req.params.id, companyId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!bus) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    const { busNumber, busType, totalSeats, capacity, facilities, isActive } = req.body;
    const updates = {};

    if (busNumber && busNumber !== bus.busNumber) {
      const exists = await Bus.findOne({
        where: { busNumber: String(busNumber).trim(), companyId, id: { [Op.ne]: bus.id } }
      });
      if (exists) {
        await transaction.rollback();
        return res.status(409).json({ success: false, message: 'So xe da ton tai' });
      }
      updates.busNumber = String(busNumber).trim();
    } else if (busNumber) {
      updates.busNumber = String(busNumber).trim();
    }

    if (busType) {
      updates.busType = busType;
    }

    let seatsChanged = false;
    if (totalSeats != null) {
      const parsedTotalSeats = parseInt(totalSeats, 10);
      if (Number.isNaN(parsedTotalSeats) || parsedTotalSeats <= 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid seat count' });
      }
      updates.totalSeats = parsedTotalSeats;
      seatsChanged = true;
      const parsedCapacity = capacity != null ? parseInt(capacity, 10) : parsedTotalSeats;
      updates.capacity = Number.isNaN(parsedCapacity) ? parsedTotalSeats : parsedCapacity;
    } else if (capacity != null) {
      const parsedCapacity = parseInt(capacity, 10);
      if (Number.isNaN(parsedCapacity) || parsedCapacity <= 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid capacity' });
      }
      updates.capacity = parsedCapacity;
    }

    if (facilities != null) {
      updates.facilities = Array.isArray(facilities)
        ? facilities
        : typeof facilities === 'string'
          ? facilities.split(',').map((item) => item.trim()).filter(Boolean)
          : [];
    }

    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
    }

    await bus.update(updates, { transaction });
    await bus.reload({ transaction });

    await ensureSeatsForBus(Seat, bus, { transaction });

    await transaction.commit();

    res.json({ success: true, message: 'Cap nhat xe thanh cong', data: bus });
  } catch (error) {
    await transaction.rollback();
    console.error('updateBus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update bus', error: error.message });
  }
};

exports.deleteBus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const bus = await Bus.findOne({ where: { id: req.params.id, companyId } });
    if (!bus) return res.status(404).json({ success: false, message: 'Không tìm thấy xe' });
    await bus.destroy();
    res.json({ success: true, message: 'Xóa xe thành công' });
  } catch (error) {
    console.error('❌ deleteBus error:', error);
    res.status(500).json({ success: false, message: 'Không thể xóa xe', error: error.message });
  }
};

// ========================= TRIP MANAGEMENT =========================
exports.getMyTrips = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing companyId' });
    const trips = await Trip.findAll({
      where: { companyId },
      include: [
        { model: Bus, as: 'bus' },
        { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
        { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
        { model: Route, as: 'route' }
      ],
      order: [['departureTime', 'ASC']]
    });

    const shaped = trips.map((trip) => {
      const plain = trip.toJSON();
      const depObj = plain.departureLocation;
      const arrObj = plain.arrivalLocation;
      const depName = depObj && typeof depObj === 'object' && depObj.name ? depObj.name : (depObj || 'N/A');
      const arrName = arrObj && typeof arrObj === 'object' && arrObj.name ? arrObj.name : (arrObj || 'N/A');
      return {
        ...plain,
        route: (depName || 'N/A') + ' -> ' + (arrName || 'N/A')
      };
    });

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error('getMyTrips error:', error);
    res.status(500).json({ success: false, message: 'Failed to load trips', error: error.message });
  }
};
exports.createTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing companyId' });

    const {
      busId,
      departureLocationId,
      arrivalLocationId,
      departureTime,
      arrivalTime,
      basePrice,
      status = 'SCHEDULED'
    } = req.body;

    if (!busId || !departureLocationId || !arrivalLocationId || !departureTime || !arrivalTime || basePrice == null) {
      return res.status(400).json({ success: false, message: 'Missing required trip information' });
    }

    const bus = await Bus.findOne({ where: { id: busId, companyId } });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found or not assigned to this company' });
    }

    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid departure or arrival time' });
    }

    const numericBasePrice = Number(basePrice);
    if (!Number.isFinite(numericBasePrice) || numericBasePrice < 0) {
      return res.status(400).json({ success: false, message: 'Invalid base price' });
    }

    const route = await resolveRoute({
      fromLocationId: departureLocationId,
      toLocationId: arrivalLocationId,
      basePrice: numericBasePrice,
      departureTime: departure,
      arrivalTime: arrival
    });

    const trip = await Trip.create({
      companyId,
      busId: bus.id,
      departureLocationId,
      arrivalLocationId,
      routeId: route.id,
      departureTime: departure,
      arrivalTime: arrival,
      basePrice: numericBasePrice,
      status,
      totalSeats: bus.totalSeats,
      availableSeats: bus.totalSeats
    });

    res.status(201).json({ success: true, message: 'Created trip successfully', data: trip });
  } catch (error) {
    console.error('createTrip error:', error);
    res.status(500).json({ success: false, message: 'Failed to create trip', error: error.message });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ where: { id: req.params.id, companyId } });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    const {
      busId,
      departureLocationId,
      arrivalLocationId,
      departureTime,
      arrivalTime,
      basePrice,
      status
    } = req.body || {};

    const updates = {};

    if (busId != null) {
      const bus = await Bus.findOne({ where: { id: busId, companyId } });
      if (!bus) {
        return res.status(404).json({ success: false, message: 'Bus not found or not assigned to this company' });
      }
      updates.busId = bus.id;
      updates.totalSeats = bus.totalSeats;
      updates.availableSeats = Math.min(trip.availableSeats, bus.totalSeats);
    }

    let targetDepartureId = trip.departureLocationId;
    if (departureLocationId != null) {
      targetDepartureId = Number(departureLocationId);
      updates.departureLocationId = targetDepartureId;
    }

    let targetArrivalId = trip.arrivalLocationId;
    if (arrivalLocationId != null) {
      targetArrivalId = Number(arrivalLocationId);
      updates.arrivalLocationId = targetArrivalId;
    }

    if (targetDepartureId && targetArrivalId && Number(targetDepartureId) === Number(targetArrivalId)) {
      return res.status(400).json({ success: false, message: 'Departure and arrival locations must be different' });
    }

    let departureDate = new Date(trip.departureTime);
    if (departureTime != null) {
      const parsedDeparture = new Date(departureTime);
      if (Number.isNaN(parsedDeparture.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid departure time' });
      }
      departureDate = parsedDeparture;
      updates.departureTime = parsedDeparture;
    }

    let arrivalDate = new Date(trip.arrivalTime);
    if (arrivalTime != null) {
      const parsedArrival = new Date(arrivalTime);
      if (Number.isNaN(parsedArrival.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid arrival time' });
      }
      arrivalDate = parsedArrival;
      updates.arrivalTime = parsedArrival;
    }

    if (arrivalDate <= departureDate) {
      return res.status(400).json({ success: false, message: 'Arrival time must be after departure time' });
    }

    let targetBasePrice = Number(trip.basePrice);
    if (basePrice != null) {
      const numericBasePrice = Number(basePrice);
      if (!Number.isFinite(numericBasePrice) || numericBasePrice < 0) {
        return res.status(400).json({ success: false, message: 'Invalid base price' });
      }
      targetBasePrice = numericBasePrice;
      updates.basePrice = numericBasePrice;
    }

    if (status) {
      updates.status = status;
    }

    if (targetDepartureId && targetArrivalId) {
      const route = await resolveRoute({
        fromLocationId: targetDepartureId,
        toLocationId: targetArrivalId,
        basePrice: targetBasePrice,
        departureTime: departureDate,
        arrivalTime: arrivalDate
      });
      updates.routeId = route.id;
    }

    await trip.update(updates);

    res.json({ success: true, message: 'Updated trip successfully', data: trip });
  } catch (error) {
    console.error('updateTrip error:', error);
    res.status(500).json({ success: false, message: 'Failed to update trip', error: error.message });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const trip = await Trip.findOne({ where: { id: req.params.id, companyId } });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    await trip.destroy();
    res.json({ success: true, message: 'Deleted trip successfully' });
  } catch (error) {
    console.error('deleteTrip error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải danh sách xe', error: error.message });
  }
};

// ========================= BOOKING MANAGEMENT =========================
exports.getCompanyBookings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing companyId' });
    const bookings = await Booking.findAll({
      include: [
        {
          model: Trip,
          as: 'trip',
          where: { companyId },
          required: true,
          include: [
            { model: Bus, as: 'bus' },
            { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
            { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
            { model: Route, as: 'route' }
          ]
        },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const shaped = bookings.map((booking) => {
      const plain = booking.toJSON();
      const trip = plain.trip || {};
      const depName = trip.departureLocation?.name || trip.departureLocation || '';
      const arrName = trip.arrivalLocation?.name || trip.arrivalLocation || '';
      return {
        ...plain,
        trip: {
          ...trip,
          departureLocation: depName,
          arrivalLocation: arrName,
          route: depName && arrName ? `${depName} -> ${arrName}` : trip.route
        }
      };
    });

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error('getCompanyBookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load company bookings', error: error.message });
  }
};

// ========================= REPORT MANAGEMENT =========================
exports.reportUser = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { userId, bookingId, reason } = req.body;
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing companyId' });
    const report = await UserReport.create({ companyId, userId, bookingId, reason });
    res.status(201).json({ success: true, message: 'Report submitted successfully', data: report });
  } catch (error) {
    console.error('reportUser error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit report', error: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing companyId' });
    const reports = await UserReport.findAll({
      where: { companyId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Booking, as: 'booking' }
      ]
    });
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('getReports error:', error);
    res.status(500).json({ success: false, message: 'Failed to load reports', error: error.message });
  }
};











