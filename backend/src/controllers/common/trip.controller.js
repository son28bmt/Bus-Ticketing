const { Trip, Bus, BusCompany, Location, Booking, Route, Seat } = require('../../../models');
const { Op } = require('sequelize');
const { seatTypeFromBusType } = require('../../utils/seat-helper');

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
const getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing trip id' });
    }

    const trip = await Trip.findOne({
      where: { id },
      include: [
        {
          model: Bus,
          as: 'bus',
          include: [
            { model: BusCompany, as: 'company', attributes: ['id', 'name', 'code'] },
            { model: Seat, as: 'seats', attributes: ['id', 'seatNumber', 'seatType', 'priceMultiplier', 'isActive'] }
          ]
        },
        { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
        { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
        { model: Route, as: 'route' }
      ]
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const bookings = await Booking.findAll({
      where: {
        tripId: trip.id,
        bookingStatus: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
      },
      attributes: ['seatNumbers']
    });

    const bookedNumbers = new Set();
    const lookupSet = new Set();
    for (const booking of bookings) {
      const seatsArray = Array.isArray(booking.seatNumbers) ? booking.seatNumbers : [];
      for (const seatNumber of seatsArray) {
        if (seatNumber != null) {
          const normalized = String(seatNumber).trim();
          if (normalized.length > 0) {
            bookedNumbers.add(normalized);
            lookupSet.add(normalized);
            const numeric = Number(normalized);
            if (!Number.isNaN(numeric)) {
              lookupSet.add(String(numeric));
            }
          }
        }
      }
    }

    const totalSeats = trip.totalSeats || (trip.bus?.totalSeats ?? 0);
    const availableSeats = Math.max(totalSeats - bookedNumbers.size, 0);

    const buildSeatPayload = (seat) => {
      const plain = seat && typeof seat.toJSON === 'function' ? seat.toJSON() : seat || {};
      const rawSeatNumber = String(plain.seatNumber ?? '').trim();
      const seatNumber = rawSeatNumber.length > 0 ? rawSeatNumber : String(plain.id ?? '');
      return {
        ...plain,
        seatNumber,
        isBooked: lookupSet.has(seatNumber) || lookupSet.has(String(plain.id ?? ''))
      };
    };

    let busSeats;
    if (trip.bus && Array.isArray(trip.bus.seats) && trip.bus.seats.length > 0) {
      busSeats = trip.bus.seats
        .map((seat) => buildSeatPayload(seat))
        .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' }));
    } else {
      const seatType = seatTypeFromBusType(trip.bus?.busType);
      busSeats = Array.from({ length: Math.max(totalSeats, 0) }, (_, index) => {
        const seatNumber = (index + 1).toString().padStart(2, '0');
        return {
          id: index + 1,
          seatNumber,
          seatType,
          priceMultiplier: seatType === 'VIP' ? 1.2 : seatType === 'SLEEPER' ? 1.1 : 1,
          isActive: true,
          isBooked: lookupSet.has(seatNumber) || lookupSet.has(String(index + 1))
        };
      });
    }

    const tripJson = trip.toJSON();
    const responseTrip = {
      ...tripJson,
      totalSeats,
      availableSeats,
      isAvailable: availableSeats > 0,
      bookedSeatNumbers: Array.from(bookedNumbers)
    };

    if (responseTrip.bus) {
      responseTrip.bus = {
        ...responseTrip.bus,
        seats: busSeats
      };
    }

    return res.json({ success: true, trip: responseTrip });
  } catch (error) {
    console.error('Error getting trip by ID:', error);
    return res.status(500).json({ success: false, message: 'Server error while retrieving trip' });
  }
};

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
    const now = new Date();

    if (departureDate) {
      const startOfDay = new Date(departureDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(departureDate);
      endOfDay.setHours(23, 59, 59, 999);

      if (endOfDay < now) {
        return res.json({
          success: true,
          trips: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalItems: 0,
            limit: parseInt(limit)
          }
        });
      }

      const effectiveStart = startOfDay < now ? now : startOfDay;

      whereClause.departureTime = {
        [Op.between]: [effectiveStart, endOfDay]
      };
    } else {
      whereClause.departureTime = {
        [Op.gte]: now
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
        },
        {
          model: Route,
          as: 'route'
        }
      ],
      order: [['departureTime', 'ASC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    // Calculate available seats for each trip
    const tripsWithAvailability = await Promise.all(
      trips.map(async (trip) => {
        const bookings = await Booking.findAll({
          where: {
            tripId: trip.id,
            bookingStatus: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
          },
          attributes: ['seatNumbers']
        });

        const bookedSeatNumbersSet = new Set();
        const bookedSeatLookupSet = new Set();
        for (const booking of bookings) {
          const seatsArray = Array.isArray(booking.seatNumbers) ? booking.seatNumbers : [];
          seatsArray.forEach((seatNumber) => {
            if (seatNumber != null) {
              const normalized = String(seatNumber).trim();
              if (normalized.length > 0) {
                bookedSeatNumbersSet.add(normalized);
                bookedSeatLookupSet.add(normalized);
                const numeric = Number(normalized);
                if (!Number.isNaN(numeric)) {
                  bookedSeatLookupSet.add(String(numeric));
                }
              }
            }
          });
        }

        const bookedSeatsCount = bookedSeatNumbersSet.size;
        const totalSeats = trip.totalSeats || (trip.bus?.totalSeats ?? 0);
        const availableSeats = Math.max(totalSeats - bookedSeatsCount, 0);

        let busSeats = [];
        if (trip.bus && Array.isArray(trip.bus.seats) && trip.bus.seats.length > 0) {
          busSeats = trip.bus.seats
            .map((seat) => {
              const seatPlain = seat.toJSON ? seat.toJSON() : seat;
              const seatNumber = String(seatPlain.seatNumber ?? '').trim();
              const normalizedSeatNumber = seatNumber.length > 0 ? seatNumber : String(seatPlain.id ?? '');
              return {
                ...seatPlain,
                seatNumber: normalizedSeatNumber,
                isBooked: bookedSeatLookupSet.has(normalizedSeatNumber) || bookedSeatLookupSet.has(String(seatPlain.id ?? ''))
              };
            })
            .sort((a, b) => {
              const aNum = a.seatNumber;
              const bNum = b.seatNumber;
              return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
            });
        } else {
          const seatType = seatTypeFromBusType(trip.bus?.busType);
          const fallbackSeats = [];
          for (let index = 1; index <= totalSeats; index += 1) {
            const seatNumber = index.toString().padStart(2, '0');
            fallbackSeats.push({
              id: index,
              seatNumber,
              seatType,
              priceMultiplier: seatType === 'VIP' ? 1.2 : seatType === 'SLEEPER' ? 1.1 : 1,
              isActive: true,
              isBooked: bookedSeatLookupSet.has(seatNumber) || bookedSeatLookupSet.has(String(index))
            });
          }
          busSeats = fallbackSeats;
        }

        const tripJson = trip.toJSON();
        const responseTrip = {
          ...tripJson,
          totalSeats,
          availableSeats,
          isAvailable: availableSeats > 0,
          bookedSeatNumbers: Array.from(bookedSeatNumbersSet),
          bus: tripJson.bus ? { ...tripJson.bus, seats: busSeats } : undefined
        };

        return responseTrip;
      })
    );

    // Filter out malformed trips (missing location or bus)
    const validTrips = tripsWithAvailability.filter(t => !!(t.departureLocation && t.arrivalLocation && t.bus));

    const totalPages = Math.ceil(count / parseInt(limit, 10)) || 0;

    return res.json({
      success: true,
      trips: validTrips,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages,
        totalItems: count,
        limit: parseInt(limit, 10)
      }
    });

  } catch (error) {
    console.error('❌ Search trips error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tìm chuyến xe' });
  }
};

const getFeaturedTrips = async (req, res) => {
  try {
    const requestedLimit = parseInt(req.query.limit || '10', 10);
    const limit = Number.isNaN(requestedLimit) ? 10 : Math.min(Math.max(requestedLimit, 1), 20);

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
        { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
        { model: Route, as: 'route' }
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

    const validTrips = tripsWithAvailability.filter(t => !!(t.departureLocation && t.arrivalLocation && t.bus));

    return res.json({ success: true, trips: validTrips, pagination: { totalItems: validTrips.length, limit } });
  } catch (error) {
    console.error('❌ Get featured trips error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy chuyến xe nổi bật' });
  }
};

module.exports = {
  searchTrips,
  getLocations,
  getTripById,
  getFeaturedTrips
};
