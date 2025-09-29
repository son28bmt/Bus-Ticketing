const { User, Trip, Bus, Booking, Payment, Location, BusCompany, sequelize } = require('../../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// ✅ Get trip details with bookings for admin
const getTripDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu mã chuyến xe' });
    }

    // Get trip with all related information
    const trip = await Trip.findOne({
      where: { id },
      include: [
        {
          model: Bus,
          as: 'bus',
          include: [{
            model: BusCompany,
            as: 'company',
            attributes: ['id', 'name', 'code']
          }]
        },
        {
          model: Location,
          as: 'departureLocation',
          attributes: ['id', 'name', 'province']
        },
        {
          model: Location,
          as: 'arrivalLocation',
          attributes: ['id', 'name', 'province']
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe' });
    }

    // Get all bookings for this trip
    const bookings = await Booking.findAll({
      where: {
        tripId: trip.id,
        bookingStatus: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      attributes: ['id', 'bookingCode', 'seatNumbers', 'totalPrice', 'passengerName', 'passengerPhone', 'bookingStatus', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Calculate seat statistics
    const bookedSeats = bookings.reduce((acc, booking) => {
      if (Array.isArray(booking.seatNumbers)) {
        acc.push(...booking.seatNumbers);
      }
      return acc;
    }, []);

    const totalSeats = trip.totalSeats || (trip.bus?.totalSeats ?? 0);
    const availableSeats = Math.max(totalSeats - bookedSeats.length, 0);

    console.log(`✅ Retrieved trip details for trip ${id}: ${bookings.length} bookings, ${bookedSeats.length} booked seats`);

    res.json({
      success: true,
      tripDetails: {
        trip: trip.toJSON(),
        bookings: bookings.map(b => b.toJSON()),
        seatInfo: {
          totalSeats,
          bookedSeats: bookedSeats.sort((a, b) => a - b),
          availableSeats,
          occupancyRate: totalSeats > 0 ? Math.round((bookedSeats.length / totalSeats) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting trip details:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết chuyến xe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Get all bookings for admin
const getAllBookings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentStatus,
      search,
      startDate,
      endDate
    } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;
    const whereClause = {};

    if (status) whereClause.bookingStatus = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    if (search) {
      whereClause[Op.or] = [
  { bookingCode: { [Op.like]: `%${search}%` } },
  { passengerName: { [Op.like]: `%${search}%` } },
  { passengerPhone: { [Op.like]: `%${search}%` } }
      ];
    }
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Do count separately to avoid include alias issues in count()
    const count = await Booking.count({ where: whereClause });

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Bus,
              as: 'bus',
              attributes: ['busNumber', 'busType', 'totalSeats'],
              include: [{ model: BusCompany, as: 'company', attributes: ['id','name','code'] }]
            },
            { model: Location, as: 'departureLocation', attributes: ['id','name','province'] },
            { model: Location, as: 'arrivalLocation', attributes: ['id','name','province'] }
          ]
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['id','paymentCode','amount','paymentMethod','paymentStatus','paidAt']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    // Shape data: ensure trip.departureLocation/arrivalLocation are strings
    const shaped = bookings.map(b => {
      const plain = b.toJSON();
      const depName = plain.trip?.departureLocation?.name || plain.trip?.departureLocation || '';
      const arrName = plain.trip?.arrivalLocation?.name || plain.trip?.arrivalLocation || '';
      return {
        ...plain,
        trip: plain.trip ? {
          ...plain.trip,
          departureLocation: depName,
          arrivalLocation: arrName,
          route: `${depName} -> ${arrName}`
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        bookings: shaped,
        pagination: {
          total: count,
          page: pageNum,
          pages: Math.ceil(count / limitNum),
          limit: limitNum
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting all bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách đặt vé',
      error: error.message
    });
  }
};

// ✅ Get booking statistics
const getBookingStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalBookings,
      todayBookings,
      weekBookings,
      monthBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue
    ] = await Promise.all([
      Booking.count(),
      Booking.count({
        where: {
          createdAt: { [Op.gte]: startOfToday }
        }
      }),
      Booking.count({
        where: {
          createdAt: { [Op.gte]: startOfWeek }
        }
      }),
      Booking.count({
        where: {
          createdAt: { [Op.gte]: startOfMonth }
        }
      }),
      Booking.count({
        where: { bookingStatus: 'CONFIRMED' }
      }),
      Booking.count({
        where: { bookingStatus: 'CANCELLED' }
      }),
      Booking.sum('totalPrice', {
        where: { 
          paymentStatus: 'PAID',
          bookingStatus: 'CONFIRMED'
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalBookings,
        todayBookings,
        weekBookings,
        monthBookings,
        confirmedBookings,
        cancelledBookings,
        totalRevenue: totalRevenue || 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê đặt vé',
      error: error.message
    });
  }
};

// ✅ Existing functions...
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (role) whereClause.role = role;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách người dùng',
      error: error.message
    });
  }
};

const getAllTrips = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { route: { [Op.like]: `%${search}%` } },
        { departureLocation: { [Op.like]: `%${search}%` } },
        { arrivalLocation: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: trips } = await Trip.findAndCountAll({
      where: whereClause,
      include: [{
        model: Bus,
        as: 'bus',
        attributes: ['busNumber', 'busType', 'totalSeats'],
        include: [{ model: BusCompany, as: 'company', attributes: ['id','name','code'] }]
      },
      { model: Location, as: 'departureLocation', attributes: ['id','name','province'] },
      { model: Location, as: 'arrivalLocation', attributes: ['id','name','province'] }
      ],
      order: [['departureTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        trips,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting trips:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách chuyến xe',
      error: error.message
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalTrips, totalBookings, totalRevenue] = await Promise.all([
      User.count(),
      Trip.count(),
      Booking.count({ where: { bookingStatus: 'CONFIRMED' } }),
      Booking.sum('totalPrice', {
        where: { 
          paymentStatus: 'PAID',
          bookingStatus: 'CONFIRMED'
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalTrips,
        totalBookings,
        totalRevenue: totalRevenue || 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê tổng quan',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getAllTrips,
  getAllBookings, // ✅ Add booking functions
  getBookingStats, // ✅ Add booking stats
  getDashboardStats
};

// ✅ Additional admin handlers required by routes
// Overview stats
const getOverviewStats = async (req, res) => {
  try {
    const [totalUsers, totalTrips, totalBookings, totalBuses, totalRevenue] = await Promise.all([
      User.count(),
      Trip.count(),
      Booking.count(),
      Bus.count(),
      Booking.sum('totalPrice', { where: { paymentStatus: 'PAID' } })
    ]);

    return res.json({
      totalUsers,
      totalTrips,
      totalBookings,
      totalBuses,
      totalRevenue: Number(totalRevenue) || 0
    });
  } catch (error) {
    console.error('❌ getOverviewStats error:', error);
    return res.status(500).json({ message: 'Lỗi lấy thống kê tổng quan' });
  }
};

// Revenue stats for last 7 days
const getRevenueStats = async (req, res) => {
  try {
    const days = 7;
    const today = new Date();
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const start = new Date(day); start.setHours(0,0,0,0);
      const end = new Date(day); end.setHours(23,59,59,999);
      const revenue = await Booking.sum('totalPrice', {
        where: {
          createdAt: { [Op.between]: [start, end] },
          paymentStatus: 'PAID',
          bookingStatus: { [Op.in]: ['CONFIRMED','COMPLETED'] }
        }
      }) || 0;
      const bookingCount = await Booking.count({
        where: { createdAt: { [Op.between]: [start, end] } }
      });
      daily.push({
        date: start.toISOString().slice(0,10),
        dayName: start.toLocaleDateString('vi-VN', { weekday: 'short' }),
        revenue: Number(revenue),
        bookingCount
      });
    }
    return res.json({ daily });
  } catch (error) {
    console.error('❌ getRevenueStats error:', error);
    return res.status(500).json({ message: 'Lỗi lấy thống kê doanh thu' });
  }
};

// Trip status distribution
const getTripStats = async (req, res) => {
  try {
    const statuses = ['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'];
    const counts = await Promise.all(statuses.map(s => Trip.count({ where: { status: s } })));
    return res.json({ labels: statuses, data: counts });
  } catch (error) {
    console.error('❌ getTripStats error:', error);
    return res.status(500).json({ message: 'Lỗi lấy thống kê chuyến xe' });
  }
};

// Recent bookings
const getRecentBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id','name'] },
        { 
          model: Trip, 
          as: 'trip', 
          attributes: ['id','departureTime','arrivalTime'],
          include: [
            { model: Location, as: 'departureLocation', attributes: ['name'] },
            { model: Location, as: 'arrivalLocation', attributes: ['name'] }
          ]
        }
      ],
      order: [['createdAt','DESC']],
      limit: 10
    });
    const mapped = bookings.map(b => ({
      id: b.id,
      customerName: b.user?.name || 'N/A',
      route: `${b.trip?.departureLocation?.name || ''} → ${b.trip?.arrivalLocation?.name || ''}`.trim(),
      amount: Number(b.totalPrice) || 0,
      time: new Date(b.createdAt).toLocaleString('vi-VN'),
      status: b.bookingStatus,
      bookingCode: b.bookingCode
    }));
    return res.json(mapped);
  } catch (error) {
    console.error('❌ getRecentBookings error:', error);
    return res.status(500).json({ message: 'Lỗi lấy hoạt động đặt vé gần đây' });
  }
};

// Legacy wrappers
const getStats = getOverviewStats;
const getRevenue = getRevenueStats;

// User management
const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role = 'PASSENGER' } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });
    }
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ success: false, message: 'Email đã tồn tại' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, passwordHash, role, status: 'ACTIVE' });
    return res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('❌ createUser error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tạo người dùng' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, status } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    await user.update({ name: name ?? user.name, phone: phone ?? user.phone, role: role ?? user.role, status: status ?? user.status });
    return res.json({ success: true, user });
  } catch (error) {
    console.error('❌ updateUser error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật người dùng' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    await user.destroy();
    return res.json({ success: true, message: 'Đã xóa người dùng' });
  } catch (error) {
    console.error('❌ deleteUser error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xóa người dùng' });
  }
};

// Trip management
const createTrip = async (req, res) => {
  try {
    const { busId, departureLocationId, arrivalLocationId, departureTime, arrivalTime, basePrice, status = 'SCHEDULED' } = req.body;
    if (!busId || !departureLocationId || !arrivalLocationId || !departureTime || !arrivalTime || !basePrice) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu bắt buộc' });
    }

    // Derive companyId from the selected bus
    const bus = await Bus.findByPk(busId);
    if (!bus) return res.status(400).json({ success: false, message: 'Xe không tồn tại' });

    // If bus has no company, set to default company (1)
    let effectiveCompanyId = bus.companyId;
    if (!effectiveCompanyId) {
      console.log('⚠️ Bus has no companyId, using default company (1)');
      effectiveCompanyId = 1;
    }

    // Validate locations exist
    const [depLoc, arrLoc] = await Promise.all([
      Location.findByPk(departureLocationId),
      Location.findByPk(arrivalLocationId)
    ]);
    if (!depLoc) {
      return res.status(400).json({ success: false, message: 'Điểm đi không hợp lệ' });
    }
    if (!arrLoc) {
      return res.status(400).json({ success: false, message: 'Điểm đến không hợp lệ' });
    }
    if (Number(departureLocationId) === Number(arrivalLocationId)) {
      return res.status(400).json({ success: false, message: 'Điểm đi và điểm đến không được trùng nhau' });
    }

    // Basic time validation
    const depTime = new Date(departureTime);
    const arrTime = new Date(arrivalTime);
    if (isNaN(depTime.getTime()) || isNaN(arrTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Thời gian không hợp lệ' });
    }
    if (arrTime <= depTime) {
      return res.status(400).json({ success: false, message: 'Giờ đến phải sau giờ đi' });
    }

    const trip = await Trip.create({
      companyId: effectiveCompanyId,
      busId,
      departureLocationId,
      arrivalLocationId,
      departureTime: depTime,
      arrivalTime: arrTime,
      basePrice: Number(basePrice),
      status,
      totalSeats: bus.totalSeats,
      availableSeats: bus.totalSeats
    });
    return res.status(201).json({ success: true, trip });
  } catch (error) {
    console.error('❌ createTrip error:', error?.message || error, 'Payload:', req.body);
    // Map common DB constraint errors to 400 with clearer messages
    const name = error?.name || '';
    const msg = String(error?.message || '');
    if (name.includes('ForeignKeyConstraintError') || msg.includes('foreign key constraint')) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ: Xe hoặc địa điểm không tồn tại' });
    }
    if (name.includes('SequelizeValidationError')) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ: ' + msg });
    }
    return res.status(500).json({ success: false, message: 'Lỗi tạo chuyến xe' });
  }
};

const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findByPk(id);
    if (!trip) return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe' });
    const updates = req.body || {};
    await trip.update(updates);
    return res.json({ success: true, trip });
  } catch (error) {
    console.error('❌ updateTrip error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật chuyến xe' });
  }
};

const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findByPk(id);
    if (!trip) return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe' });
    await trip.destroy();
    return res.json({ success: true, message: 'Đã xóa chuyến xe' });
  } catch (error) {
    console.error('❌ deleteTrip error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xóa chuyến xe' });
  }
};

// Admin update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy vé đặt' });
    await booking.update({
      bookingStatus: status ?? booking.bookingStatus,
      paymentStatus: paymentStatus ?? booking.paymentStatus
    });
    return res.json({ success: true, booking });
  } catch (error) {
    console.error('❌ admin.updateBookingStatus error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật vé' });
  }
};

// Export additional functions
module.exports.getOverviewStats = getOverviewStats;
module.exports.getRevenueStats = getRevenueStats;
module.exports.getTripStats = getTripStats;
module.exports.getRecentBookings = getRecentBookings;
module.exports.getStats = getStats;
module.exports.getRevenue = getRevenue;
module.exports.createUser = createUser;
module.exports.updateUser = updateUser;
module.exports.deleteUser = deleteUser;
module.exports.createTrip = createTrip;
module.exports.updateTrip = updateTrip;
module.exports.deleteTrip = deleteTrip;
module.exports.getTripDetails = getTripDetails;
module.exports.updateBookingStatus = updateBookingStatus;