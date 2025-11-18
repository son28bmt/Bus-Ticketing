const { Bus, Trip, Booking, BusCompany, User, UserReport, Location, Route, Seat, Driver, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const { ensureSeatsForBus } = require('../../utils/seat-helper');
const mailService = require('../../services/mail.service');

const shapeCompanyBooking = (bookingInstance) => {
  if (!bookingInstance) return null;
  const plain = bookingInstance.toJSON();
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
};

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

const loadDriverAssignment = async ({ driverId, companyId, departure, arrival, excludeTripId }) => {
  if (driverId == null || driverId === '') {
    return { driverId: null, driver: null };
  }

  const numericDriverId = Number(driverId);
  if (!Number.isFinite(numericDriverId)) {
    return { error: { status: 400, message: 'Invalid driverId' } };
  }

  const driver = await Driver.findOne({
    where: { id: numericDriverId, companyId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone', 'email'] }]
  });

  if (!driver) {
    return { error: { status: 404, message: 'Driver not found in this company' } };
  }

  if (driver.status !== 'ACTIVE') {
    return { error: { status: 409, message: 'Driver is not active' } };
  }

  const conflictWhere = {
    driverId: numericDriverId,
    status: { [Op.notIn]: ['CANCELLED', 'COMPLETED'] },
    departureTime: { [Op.lt]: arrival },
    arrivalTime: { [Op.gt]: departure }
  };

  if (excludeTripId) {
    conflictWhere.id = { [Op.ne]: excludeTripId };
  }

  const conflict = await Trip.findOne({
    where: conflictWhere,
    attributes: ['id', 'departureTime', 'arrivalTime', 'status']
  });

  if (conflict) {
    return {
      error: {
        status: 409,
        message: 'Driver already assigned to another trip in this time range',
        conflict
      }
    };
  }

  return { driverId: numericDriverId, driver };
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
        { model: Route, as: 'route' },
        {
          model: Driver,
          as: 'driver',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }]
        }
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
      status = 'SCHEDULED',
      driverId
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
    if (arrival <= departure) {
      return res.status(400).json({ success: false, message: 'Arrival time must be after departure time' });
    }
    const now = new Date();
    if (departure <= now) {
      return res.status(400).json({ success: false, message: 'Departure time must be in the future' });
    }

    const numericBasePrice = Number(basePrice);
    if (!Number.isFinite(numericBasePrice) || numericBasePrice < 0) {
      return res.status(400).json({ success: false, message: 'Invalid base price' });
    }

    const existingTrip = await Trip.findOne({
      where: {
        busId: bus.id,
        companyId,
        status: { [Op.ne]: 'CANCELLED' },
        departureTime: { [Op.lt]: arrival },
        arrivalTime: { [Op.gt]: departure }
      },
      attributes: ['id', 'departureTime', 'arrivalTime']
    });

    if (existingTrip) {
      return res.status(409).json({
        success: false,
        message: 'Bus already has a trip scheduled during this time window',
        conflict: existingTrip
      });
    }

    const driverAssignment = await loadDriverAssignment({
      driverId,
      companyId,
      departure,
      arrival,
      excludeTripId: null
    });

    if (driverAssignment?.error) {
      return res.status(driverAssignment.error.status).json({
        success: false,
        message: driverAssignment.error.message,
        conflict: driverAssignment.error.conflict
      });
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
      driverId: driverAssignment.driverId,
      totalSeats: bus.totalSeats,
      availableSeats: bus.totalSeats
    });

    const tripWithRelations = await Trip.findByPk(trip.id, {
      include: [
        { model: Bus, as: 'bus' },
        { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
        { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
        { model: Route, as: 'route' },
        {
          model: Driver,
          as: 'driver',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }]
        }
      ]
    });

    res.status(201).json({ success: true, message: 'Created trip successfully', data: tripWithRelations });
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
      status,
      driverId
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
      const nowCheck = new Date();
      if (parsedDeparture <= nowCheck) {
        return res.status(400).json({ success: false, message: 'Departure time must be in the future' });
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

    const busIdForCheck = updates.busId ?? trip.busId;
    const overlappingTrip = await Trip.findOne({
      where: {
        busId: busIdForCheck,
        companyId,
        id: { [Op.ne]: trip.id },
        status: { [Op.ne]: 'CANCELLED' },
        departureTime: { [Op.lt]: arrivalDate },
        arrivalTime: { [Op.gt]: departureDate }
      },
      attributes: ['id', 'departureTime', 'arrivalTime']
    });

    if (overlappingTrip) {
      return res.status(409).json({
        success: false,
        message: 'Bus already has a trip scheduled during this time window',
        conflict: overlappingTrip
      });
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

    if (driverId !== undefined) {
      if (driverId === null || driverId === '' || driverId === 'null') {
        updates.driverId = null;
      } else {
        const driverAssignment = await loadDriverAssignment({
          driverId,
          companyId,
          departure: departureDate,
          arrival: arrivalDate,
          excludeTripId: trip.id
        });

        if (driverAssignment?.error) {
          return res.status(driverAssignment.error.status).json({
            success: false,
            message: driverAssignment.error.message,
            conflict: driverAssignment.error.conflict
          });
        }

        updates.driverId = driverAssignment.driverId;
      }
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

    const updatedTrip = await Trip.findByPk(trip.id, {
      include: [
        { model: Bus, as: 'bus' },
        { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
        { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
        { model: Route, as: 'route' },
        {
          model: Driver,
          as: 'driver',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }]
        }
      ]
    });

    res.json({ success: true, message: 'Updated trip successfully', data: updatedTrip });
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
exports.cancelTrip = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Missing companyId' });
    }

    const { id } = req.params;
    const { reason, note } = req.body || {};
    const normalizedReason = reason && String(reason).trim().length ? String(reason).trim() : 'Nha xe huy chuyen';
    const normalizedNote = note && String(note).trim().length ? String(note).trim() : '';

    const trip = await Trip.findOne({
      where: { id, companyId },
      include: [
        { model: Bus, as: 'bus', include: [{ model: BusCompany, as: 'company', attributes: ['name', 'code'] }] },
        { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
        { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] }
      ]
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Trip has already been cancelled.' });
    }

    const bookings = await Booking.findAll({
      where: {
        tripId: trip.id,
        bookingStatus: { [Op.not]: 'CANCELLED' }
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });

    await sequelize.transaction(async (transaction) => {
      await trip.update({ status: 'CANCELLED' }, { transaction });

      for (const booking of bookings) {
        const shouldRefund =
          booking.paymentStatus === 'PAID' || booking.paymentStatus === 'REFUND_PENDING';
        const computedRefund = shouldRefund ? Number(booking.totalPrice || 0) : booking.refundAmount;
        const notes = [booking.notes, '[System] Huy chuyen: ' + normalizedReason, normalizedNote ? '[Company] ' + normalizedNote : '']
          .filter(Boolean)
          .join('\\n');

        await booking.update(
          {
            bookingStatus: 'CANCELLED',
            paymentStatus: shouldRefund ? 'REFUNDED' : 'CANCELLED',
            refundAmount: computedRefund,
            cancelReason: normalizedReason,
            notes
          },
          { transaction }
        );
      }
    });

    await trip.reload({
      include: [
        { model: Bus, as: 'bus', include: [{ model: BusCompany, as: 'company', attributes: ['name', 'code'] }] },
        { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
        { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] }
      ]
    });

    const departureName = trip.departureLocation?.name || '---';
    const arrivalName = trip.arrivalLocation?.name || '---';
    const routeLabel = departureName + ' -> ' + arrivalName;
    const departureLabel = trip.departureTime ? new Date(trip.departureTime).toLocaleString('vi-VN') : '---';
    const companyName = trip.bus?.company?.name || trip.bus?.busNumber || 'Nha xe';

    const escapeHtml = (value = '') =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const buildEmailHtml = (booking) => {
      const refundAmount = booking.refundAmount ? Number(booking.refundAmount) : 0;
      const refundBlock =
        refundAmount > 0
          ? '<p><b>So tien hoan:</b> ' + refundAmount.toLocaleString('vi-VN') + 'd</p>'
          : '<p>Ve cua ban chua thanh toan nen chi thay doi trang thai sang huy.</p>';

      return [
        '<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">',
        '<h2 style="color:#b91c1c;margin-bottom:12px;">Thong bao huy chuyen ' + escapeHtml(routeLabel) + '</h2>',
        '<p>Chao <b>' + escapeHtml(booking.user?.name || booking.passengerName || 'Quy khach') + '</b>,</p>',
        '<p>' + escapeHtml(companyName) + ' xin thong bao chuyen xe khoi hanh luc ' + escapeHtml(departureLabel) + ' da bi huy.</p>',
        '<p><b>Ly do:</b> ' + escapeHtml(normalizedReason) + '</p>',
        normalizedNote ? '<p><b>Ghi chu:</b> ' + escapeHtml(normalizedNote) + '</p>' : '',
        refundBlock,
        '<p>Chung toi xin loi vi su bat tien va se ho tro dat chuyen moi neu quy khach co nhu cau.</p>',
        '</div>'
      ].join('');
    };

    const emailTasks = [];
    for (const booking of bookings) {
      const recipients = new Set();
      if (booking.user?.email) recipients.add(booking.user.email);
      if (booking.passengerEmail) recipients.add(booking.passengerEmail);

      recipients.forEach((email) => {
        if (!email) return;
        emailTasks.push(
          mailService.sendCustomEmail({
            to: email,
            subject: 'Thong bao huy chuyen ' + routeLabel,
            html: buildEmailHtml(booking.toJSON ? booking.toJSON() : booking)
          })
        );
      });
    }

    Promise.allSettled(emailTasks).catch((err) => {
      console.error('Trip cancellation email error:', err);
    });

    const plainTrip = trip.toJSON ? trip.toJSON() : trip.get({ plain: true });
    res.json({
      success: true,
      message: 'Da huy chuyen va thong bao toi khach hang.',
      data: {
        trip: plainTrip,
        affectedBookings: bookings.length
      }
    });
  } catch (error) {
    console.error('cancelTrip error:', error);
    res.status(500).json({
      success: false,
      message: 'Khong the huy chuyen xe',
      error: error.message
    });
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

    const shaped = bookings
      .map((booking) => shapeCompanyBooking(booking))
      .filter(Boolean);

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error('getCompanyBookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load company bookings', error: error.message });
  }
};

exports.approveCancellationRequest = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Missing companyId' });
    }

    const { id } = req.params;
    const extraNote = typeof (req.body?.note) === 'string' ? req.body.note.trim() : '';

    const booking = await Booking.findOne({
      where: { id, companyId },
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Bus, as: 'bus' },
            { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
            { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.bookingStatus !== 'CANCEL_REQUESTED') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not awaiting cancellation approval.'
      });
    }

    const departure = booking.trip ? new Date(booking.trip.departureTime) : null;
    const now = new Date();
    const hoursBefore = departure ? (departure.getTime() - now.getTime()) / (1000 * 60 * 60) : 0;

    let refundRate = 0;
    if (hoursBefore >= 24) refundRate = 1;
    else if (hoursBefore >= 6) refundRate = 0.5;

    const refundAmount = Math.round(Number(booking.totalPrice || 0) * refundRate);
    const seatCount = Array.isArray(booking.seatNumbers) ? booking.seatNumbers.length : 0;
    const combinedNotes = [booking.notes, extraNote ? `[Company] ${extraNote}` : '']
      .filter(Boolean)
      .join('\n');

    await sequelize.transaction(async (transaction) => {
      const tripInstance =
        booking.trip ||
        (await Trip.findByPk(booking.tripId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        }));

      if (tripInstance) {
        const releasedSeats = Math.min(
          tripInstance.totalSeats,
          (tripInstance.availableSeats || 0) + seatCount
        );
        await tripInstance.update({ availableSeats: releasedSeats }, { transaction });
      }

      await booking.update(
        {
          bookingStatus: 'CANCELLED',
          paymentStatus: refundRate > 0 ? 'REFUNDED' : 'CANCELLED',
          refundAmount,
          notes: combinedNotes
        },
        { transaction }
      );
    });

    await booking.reload({
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Bus, as: 'bus' },
            { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
            { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] }
          ]
        },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    const shapedBooking = shapeCompanyBooking(booking);

    if (booking.user?.email) {
      const escapeHtml = (value = '') =>
        String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

      const departureName =
        booking.trip?.departureLocation?.name || booking.trip?.departureLocation || '';
      const arrivalName =
        booking.trip?.arrivalLocation?.name || booking.trip?.arrivalLocation || '';
      const routeLabel =
        departureName && arrivalName
          ? `${departureName} -> ${arrivalName}`
          : booking.trip?.route?.name || 'Dang cap nhat';
      const seatList = Array.isArray(booking.seatNumbers) ? booking.seatNumbers.join(', ') : '---';
      const formattedDeparture = departure
        ? departure.toLocaleString('vi-VN')
        : booking.trip?.departureTime || '---';

      const refundSummary =
        refundRate > 0
          ? `<p style="margin:4px 0 0;"><b>Muc hoan:</b> ${Math.round(
              refundRate * 100
            )}%</p><p style="margin:4px 0 0;"><b>So tien hoan:</b> ${Number(refundAmount).toLocaleString(
              'vi-VN'
            )}d</p>`
          : '<p style="margin:4px 0 0;"><b>Ve khong nam trong khung hoan tien.</b></p>';

      const companyNoteBlock = extraNote
        ? `<p style="margin-top:12px;"><b>Ghi chu tu nha xe:</b> ${escapeHtml(extraNote)}</p>`
        : '';

      const policyBlock = `<div style="border-left:4px solid #b91c1c;padding-left:12px;margin-top:24px;">
        <p style="margin:0;"><b>Chinh sach hoan tien tham khao:</b></p>
        <ul style="margin:8px 0 0 18px; color:#475569;">
          <li>Tu 24h tro len truoc gio khoi hanh: hoan 100%.</li>
          <li>Tu 6h den duoi 24h: hoan 50%.</li>
          <li>Duoi 6h: khong hoan tien.</li>
        </ul>
      </div>`;

      await mailService.sendCustomEmail({
        to: booking.user.email,
        subject: `Xac nhan huy ve ${booking.bookingCode}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
            <h2 style="color:#b91c1c;margin-bottom:12px;">Ve ${escapeHtml(
              booking.bookingCode || ''
            )} da duoc huy</h2>
            <p>Chao <b>${escapeHtml(booking.user.name || 'Quy khach')}</b>,</p>
            <p>Yeu cau huy ve cua ban da duoc nha xe xu ly thanh cong.</p>
            <div style="background:#f8fafc;padding:16px;border-radius:12px;margin:16px 0;">
              <p style="margin:0;"><b>Tuyen:</b> ${escapeHtml(routeLabel)}</p>
              <p style="margin:4px 0 0;"><b>Gio khoi hanh:</b> ${escapeHtml(formattedDeparture)}</p>
              <p style="margin:4px 0 0;"><b>Ghe:</b> ${escapeHtml(seatList)}</p>
              <p style="margin:4px 0 0;"><b>Ly do huy:</b> ${escapeHtml(
                booking.cancelReason || 'Nguoi dung khong cung cap'
              )}</p>
              ${refundSummary}
            </div>
            ${companyNoteBlock}
            ${policyBlock}
            <p style="margin-top:24px;">Cam on ban da tin tuong va su dung dich vu.</p>
          </div>
        `
      });
    }

    res.json({
      success: true,
      message: 'Request approved successfully.',
      data: shapedBooking
    });
  } catch (error) {
    console.error('approveCancellationRequest error:', error);

    if (error.status === 404) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (error.status === 400) {
      return res.status(400).json({ success: false, message: error.message || 'Invalid cancellation request' });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process cancellation request',
      error: error.message
    });
  }
};


exports.getDrivers = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing companyId' });

    const { status = 'ACTIVE', search } = req.query || {};
    const where = { companyId };
    const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : null;
    if (normalizedStatus && normalizedStatus !== 'ALL') {
      where.status = normalizedStatus;
    }

    const userWhere = {};
    if (search) {
      const keyword = String(search).trim();
      if (keyword.length) {
        userWhere[Op.or] = [
          { name: { [Op.like]: `%${keyword}%` } },
          { email: { [Op.like]: `%${keyword}%` } },
          { phone: { [Op.like]: `%${keyword}%` } }
        ];
      }
    }

    const drivers = await Driver.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
          ...(Object.keys(userWhere).length ? { where: userWhere } : {})
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('getDrivers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load drivers', error: error.message });
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

exports.getCompanyProfile = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Missing companyId' });
    }

    const company = await BusCompany.findByPk(companyId, {
      attributes: [
        'id',
        'name',
        'code',
        'phone',
        'email',
        'address',
        'description',
        'bankName',
        'bankAccountName',
        'bankAccountNumber',
        'bankCode'
      ]
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('getCompanyProfile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load company profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateCompanyProfile = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Missing companyId' });
    }

    const company = await BusCompany.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const {
      name,
      phone,
      email,
      address,
      description,
      bankName,
      bankAccountName,
      bankAccountNumber,
      bankCode
    } = req.body || {};

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (email !== undefined) updates.email = String(email).trim();
    if (address !== undefined) updates.address = address ? String(address).trim() : null;
    if (description !== undefined) updates.description = description ? String(description).trim() : null;
    if (bankName !== undefined) updates.bankName = bankName ? String(bankName).trim() : null;
    if (bankAccountName !== undefined) updates.bankAccountName = bankAccountName ? String(bankAccountName).trim() : null;
    if (bankAccountNumber !== undefined) updates.bankAccountNumber = bankAccountNumber ? String(bankAccountNumber).trim() : null;
    if (bankCode !== undefined) updates.bankCode = bankCode ? String(bankCode).trim() : null;

    await company.update(updates);

    res.json({ success: true, message: 'Cập nhật thông tin thành công', data: company });
  } catch (error) {
    console.error('updateCompanyProfile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};











