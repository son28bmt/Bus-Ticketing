const { Op } = require('sequelize');
const {
  Trip,
  Driver,
  Booking,
  Bus,
  Location,
  Route,
  TripStatusLog,
  TripReport,
  BusCompany,
  User,
  sequelize
} = require('../../../models');

const TRIP_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const STATUS_TRANSITIONS = {
  [TRIP_STATUS.SCHEDULED]: [TRIP_STATUS.IN_PROGRESS, TRIP_STATUS.CANCELLED],
  [TRIP_STATUS.IN_PROGRESS]: [TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED],
  [TRIP_STATUS.COMPLETED]: [],
  [TRIP_STATUS.CANCELLED]: []
};

const buildTripInclude = () => ([
  {
    model: Bus,
    as: 'bus',
    attributes: ['id', 'busNumber', 'busType', 'totalSeats'],
    include: [{ model: BusCompany, as: 'company', attributes: ['id', 'name', 'code'] }]
  },
  { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
  { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
  { model: Route, as: 'route' }
]);

const listTrips = async (req, res) => {
  try {
    const driverId = req.user.driverId;
    const {
      status,
      from,
      to,
      page = 1,
      limit = 10
    } = req.query;

    const numericLimit = Math.max(1, Math.min(parseInt(limit, 10) || 10, 50));
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (numericPage - 1) * numericLimit;

    const where = { driverId };

    if (status) {
      const statusList = String(status)
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);

      if (statusList.length) {
        where.status = { [Op.in]: statusList };
      }
    }

    if (from || to) {
      where.departureTime = {};
      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid from date' });
        }
        where.departureTime[Op.gte] = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid to date' });
        }
        where.departureTime[Op.lte] = toDate;
      }
    }

    const { rows: trips, count } = await Trip.findAndCountAll({
      where,
      include: buildTripInclude(),
      order: [['departureTime', 'ASC']],
      limit: numericLimit,
      offset
    });

    res.json({
      success: true,
      data: {
        trips,
        pagination: {
          total: count,
          page: numericPage,
          pages: Math.ceil(count / numericLimit),
          limit: numericLimit
        }
      }
    });
  } catch (error) {
    console.error('[driver] listTrips error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải danh sách chuyến xe', error: error.message });
  }
};

const getTripDetail = async (req, res) => {
  try {
    const driverId = req.user.driverId;
    const { id } = req.params;

    const trip = await Trip.findOne({
      where: { id, driverId },
      include: buildTripInclude()
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe' });
    }

    const [bookings, statusLogs, reports] = await Promise.all([
      Booking.findAll({
        where: {
          tripId: trip.id,
          bookingStatus: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
        },
        attributes: [
          'id',
          'bookingCode',
          'seatNumbers',
          'totalPrice',
          'passengerName',
          'passengerPhone',
          'bookingStatus',
          'createdAt'
        ],
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }],
        order: [['createdAt', 'DESC']]
      }),
      TripStatusLog.findAll({
        where: { tripId: trip.id },
        order: [['createdAt', 'ASC']],
        include: [
          {
            model: Driver,
            as: 'driver',
            attributes: ['id'],
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }]
          }
        ]
      }),
      TripReport.findAll({
        where: { tripId: trip.id },
        order: [['createdAt', 'DESC']],
        include: [
          { model: BusCompany, as: 'company', attributes: ['id', 'name', 'code'] }
        ]
      })
    ]);

    const bookedSeats = bookings.reduce((acc, booking) => {
      if (Array.isArray(booking.seatNumbers)) {
        acc.push(...booking.seatNumbers);
      }
      return acc;
    }, []);

    const totalSeats = trip.totalSeats || (trip.bus?.totalSeats ?? 0);

    res.json({
      success: true,
      data: {
        trip,
        bookings,
        seatInfo: {
          totalSeats,
          bookedSeats: bookedSeats.sort((a, b) => a - b),
          availableSeats: Math.max(totalSeats - bookedSeats.length, 0)
        },
        statusLogs,
        reports
      }
    });
  } catch (error) {
    console.error('[driver] getTripDetail error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải chi tiết chuyến xe', error: error.message });
  }
};

const updateTripStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const driverId = req.user.driverId;
    const { id } = req.params;
    const { status, note } = req.body;

    const normalizedStatus = typeof status === 'string' ? status.toUpperCase().trim() : '';
    if (!normalizedStatus || !Object.values(TRIP_STATUS).includes(normalizedStatus)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const trip = await Trip.findOne({
      where: { id, driverId },
      include: buildTripInclude(),
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!trip) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe' });
    }

    const currentStatus = trip.status;
    if (currentStatus === normalizedStatus) {
      await transaction.rollback();
      return res.json({ success: true, message: 'Trạng thái không thay đổi', trip });
    }

    const allowed = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(normalizedStatus)) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Không thể chuyển trạng thái',
        currentStatus,
        allowed
      });
    }

    const updates = { status: normalizedStatus };
    const now = new Date();
    if (normalizedStatus === TRIP_STATUS.IN_PROGRESS && !trip.startedAt) {
      updates.startedAt = now;
    }
    if ([TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED].includes(normalizedStatus)) {
      updates.endedAt = now;
    }

    await trip.update(updates, { transaction });

    await TripStatusLog.create({
      tripId: trip.id,
      driverId,
      previousStatus: currentStatus,
      newStatus: normalizedStatus,
      note: note || null
    }, { transaction });

    await transaction.commit();

    const refreshedTrip = await Trip.findByPk(trip.id, {
      include: buildTripInclude()
    });

    res.json({ success: true, message: 'Cập nhật trạng thái thành công', trip: refreshedTrip });
  } catch (error) {
    await transaction.rollback();
    console.error('[driver] updateTripStatus error:', error);
    res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái', error: error.message });
  }
};

const reportTrip = async (req, res) => {
  try {
    const driverId = req.user.driverId;
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { note } = req.body || {};

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung báo cáo' });
    }

    const trip = await Trip.findOne({
      where: { id, driverId },
      attributes: ['id', 'companyId']
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe' });
    }

    await TripReport.create({
      tripId: trip.id,
      driverId,
      companyId: companyId ?? trip.companyId,
      note: note.trim()
    });

    res.status(201).json({ success: true, message: 'Gửi báo cáo thành công' });
  } catch (error) {
    console.error('[driver] reportTrip error:', error);
    res.status(500).json({ success: false, message: 'Không thể gửi báo cáo', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const driverId = req.user.driverId;
    const driver = await Driver.findOne({
      where: { id: driverId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: BusCompany, as: 'company', attributes: ['id', 'name', 'code'] }
      ]
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
    }

    const [upcomingTrips, completedTrips] = await Promise.all([
      Trip.count({
        where: {
          driverId,
          status: { [Op.in]: [TRIP_STATUS.SCHEDULED, TRIP_STATUS.IN_PROGRESS] }
        }
      }),
      Trip.count({
        where: {
          driverId,
          status: TRIP_STATUS.COMPLETED
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        driver,
        stats: {
          upcomingTrips,
          completedTrips
        }
      }
    });
  } catch (error) {
    console.error('[driver] getProfile error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải thông tin tài xế', error: error.message });
  }
};

module.exports = {
  listTrips,
  getTripDetail,
  updateTripStatus,
  reportTrip,
  getProfile
};
