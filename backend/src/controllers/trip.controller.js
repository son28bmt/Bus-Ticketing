const { Trip, Bus, BusCompany, Location, Booking } = require('../../models');
const { Op } = require('sequelize');

// ✅ Get available locations from database (auto-seed defaults if empty)
const getLocations = async (req, res) => {
  try {
    console.log('🔄 Getting locations from database');

    let locations = await Location.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code', 'province'],
      order: [['name', 'ASC']]
    });

    let formattedLocations;
    if (!locations || locations.length === 0) {
      console.warn('⚠️ No active locations found in DB, seeding defaults');
      const defaults = [
        'Hà Nội','Hồ Chí Minh','Đà Nẵng','Huế','Nha Trang','Cần Thơ','Hải Phòng','Buôn Ma Thuột','Đà Lạt','Vũng Tàu','Quy Nhơn','Phan Thiết','Sa Pa','Hạ Long','Ninh Bình'
      ];
      // Seed into DB to ensure valid IDs for admin forms and trip creation
      const created = [];
      for (const name of defaults) {
        const code = name.toUpperCase().replace(/\s+/g, '_');
        const [loc] = await Location.findOrCreate({
          where: { code },
          defaults: { name, code, province: name, isActive: true }
        });
        created.push(loc);
      }
      // Re-query to ensure consistent ordering and attributes
      locations = await Location.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'code', 'province'],
        order: [['name', 'ASC']]
      });
      formattedLocations = {
        departure: locations.map(loc => ({ id: loc.id, name: loc.name, code: loc.code, province: loc.province })),
        arrival: locations.map(loc => ({ id: loc.id, name: loc.name, code: loc.code, province: loc.province }))
      };
    } else {
      formattedLocations = {
        departure: locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          code: loc.code,
          province: loc.province
        })),
        arrival: locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          code: loc.code,
          province: loc.province
        }))
      };
    }

    console.log(`✅ Found ${locations.length} active locations`);

    res.json({
      success: true,
      locations: formattedLocations
    });

  } catch (error) {
    console.error('❌ Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách địa điểm',
      locations: {
        departure: [],
        arrival: []
      },
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Search trips from database
const searchTrips = async (req, res) => {
  try {
    const {
      from,
      to,
      departureDate,
      passengerCount = 1,
      page = 1,
      limit = 10
    } = req.query;

    console.log('🔄 Searching trips:', { from, to, departureDate, passengerCount });

    const whereClause = {
      status: 'SCHEDULED'
    };

    // Build location filters
    const locationFilters = {};
    if (from) {
      // Search by location name or ID (MySQL uses Op.like, case-insensitive with utf8mb4 collation)
      const departureLocation = await Location.findOne({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${from}%` } },
            { id: from }
          ]
        }
      });
      if (departureLocation) {
        whereClause.departureLocationId = departureLocation.id;
      }
    }

    if (to) {
      const arrivalLocation = await Location.findOne({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${to}%` } },
            { id: to }
          ]
        }
      });
      if (arrivalLocation) {
        whereClause.arrivalLocationId = arrivalLocation.id;
      }
    }

    // Date filter
    if (departureDate) {
      const startOfDay = new Date(departureDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(departureDate);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.departureTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: trips } = await Trip.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Bus,
          as: 'bus',
          include: [
            {
              model: BusCompany,
              as: 'company',
              attributes: ['id', 'name', 'code']
            }
          ]
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
      ],
      order: [['departureTime', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate available seats for each trip
    const tripsWithAvailability = await Promise.all(
      trips.map(async (trip) => {
        // Sum number of seats from JSON arrays in bookings
        const bookings = await Booking.findAll({
          where: {
            tripId: trip.id,
            bookingStatus: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
          },
          attributes: ['seatNumbers']
        });

        const bookedSeatsCount = bookings.reduce((sum, b) => {
          const seats = Array.isArray(b.seatNumbers) ? b.seatNumbers.length : 0;
          return sum + seats;
        }, 0);

        const totalSeats = trip.totalSeats || (trip.bus?.totalSeats ?? 0);
        const availableSeats = Math.max(totalSeats - bookedSeatsCount, 0);

        return {
          ...trip.toJSON(),
          totalSeats,
          availableSeats,
          isAvailable: availableSeats >= parseInt(passengerCount)
        };
      })
    );

    console.log(`✅ Found ${count} trips`);

    res.json({
      success: true,
      trips: tripsWithAvailability,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Search trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm chuyến xe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  searchTrips,
  getLocations,
  // Additional handlers added to match routes
  getTripById: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'Thiếu mã chuyến xe' });
      }

      const trip = await Trip.findOne({
        where: { id },
        include: [
          {
            model: Bus,
            as: 'bus',
            include: [
              { model: BusCompany, as: 'company', attributes: ['id', 'name', 'code'] }
            ]
          },
          { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
          { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] }
        ]
      });

      if (!trip) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe' });
      }

      const bookings = await Booking.findAll({
        where: {
          tripId: trip.id,
          bookingStatus: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
        },
        attributes: ['seatNumbers']
      });
      const bookedSeatsCount = bookings.reduce((sum, b) => sum + (Array.isArray(b.seatNumbers) ? b.seatNumbers.length : 0), 0);

      const totalSeats = trip.totalSeats || (trip.bus?.totalSeats ?? 0);
      const availableSeats = Math.max(totalSeats - bookedSeatsCount, 0);

      return res.json({
        success: true,
        trip: {
          ...trip.toJSON(),
          totalSeats,
          availableSeats,
          isAvailable: availableSeats > 0
        }
      });
    } catch (error) {
      console.error('❌ Get trip by ID error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi server khi lấy thông tin chuyến xe' });
    }
  },

  getFeaturedTrips: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '6');

      const now = new Date();
      const { rows: trips, count } = await Trip.findAndCountAll({
        where: {
          status: 'SCHEDULED',
          departureTime: { [Op.gte]: now }
        },
        include: [
          {
            model: Bus,
            as: 'bus',
            include: [
              { model: BusCompany, as: 'company', attributes: ['id', 'name', 'code'] }
            ]
          },
          { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
          { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] }
        ],
        order: [['departureTime', 'ASC']],
        limit
      });

      const tripsWithAvailability = await Promise.all(trips.map(async (trip) => {
        const bookings = await Booking.findAll({
          where: {
            tripId: trip.id,
            bookingStatus: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
          },
          attributes: ['seatNumbers']
        });
        const bookedSeatsCount = bookings.reduce((sum, b) => sum + (Array.isArray(b.seatNumbers) ? b.seatNumbers.length : 0), 0);
        const totalSeats = trip.totalSeats || (trip.bus?.totalSeats ?? 0);
        const availableSeats = Math.max(totalSeats - bookedSeatsCount, 0);

        return {
          ...trip.toJSON(),
          totalSeats,
          availableSeats,
          isAvailable: availableSeats > 0
        };
      }));

      // ✅ Filter out malformed trips (missing location or bus)
      const validTrips = tripsWithAvailability.filter(t => !!(t.departureLocation && t.arrivalLocation && t.bus));

      return res.json({ success: true, trips: validTrips, pagination: { totalItems: validTrips.length, limit } });
    } catch (error) {
      console.error('❌ Get featured trips error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi server khi lấy chuyến xe nổi bật' });
    }
  }
};