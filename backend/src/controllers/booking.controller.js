const { Booking, Trip, User, Bus, Payment, Location, sequelize } = require('../../models');
const { Op } = require('sequelize');

const VALID_PAYMENT_METHODS = new Set(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET', 'VNPAY']);

// âœ… Create new booking
const createBooking = async (req, res) => {
  const {
    tripId,
    passengerName,
    passengerPhone,
    passengerEmail,
    seatNumbers,
    totalPrice,
    paymentMethod,
    notes
  } = req.body;

  console.log('booking.controller#createBooking payload:', {
    tripId,
    passengerName,
    seatCount: Array.isArray(seatNumbers) ? seatNumbers.length : 1
  });

  const rawSeats = Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers];
  const normalizedSeats = rawSeats
    .map((seat) => {
      if (typeof seat === 'number' || typeof seat === 'string') {
        return String(seat).trim();
      }
      return '';
    })
    .filter(Boolean);

  if (!tripId || !passengerName || !passengerPhone || normalizedSeats.length === 0 || totalPrice === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required booking information.',
      required: ['tripId', 'passengerName', 'passengerPhone', 'seatNumbers', 'totalPrice']
    });
  }

  const uniqueSeatNumbers = [...new Set(normalizedSeats)];
  if (uniqueSeatNumbers.length !== normalizedSeats.length) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate seats selected. Please review your seat choices.',
      duplicates: normalizedSeats.filter((seat, index) => normalizedSeats.indexOf(seat) !== index)
    });
  }

  const totalPriceNumber = Number(totalPrice);
  if (!Number.isFinite(totalPriceNumber) || totalPriceNumber <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Total price must be a positive number.'
    });
  }

  const sanitizedPaymentMethod = VALID_PAYMENT_METHODS.has(paymentMethod) ? paymentMethod : 'BANK_TRANSFER';

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const trip = await Trip.findByPk(tripId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!trip) {
        const notFoundError = new Error('Trip not found.');
        notFoundError.status = 404;
        throw notFoundError;
      }

      if (trip.status === 'CANCELLED') {
        const cancelledError = new Error('Trip is no longer available for booking.');
        cancelledError.status = 409;
        throw cancelledError;
      }

      const departureTime = new Date(trip.departureTime).getTime();
      if (Number.isFinite(departureTime) && departureTime <= Date.now()) {
        const departedError = new Error('Trip has already departed.');
        departedError.status = 409;
        throw departedError;
      }

      if (trip.availableSeats < uniqueSeatNumbers.length) {
        const capacityError = new Error('Not enough seats available.');
        capacityError.status = 409;
        capacityError.availableSeats = trip.availableSeats;
        throw capacityError;
      }

      const existingBookings = await Booking.findAll({
        where: {
          tripId,
          bookingStatus: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
        },
        attributes: ['seatNumbers'],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const bookedSeatSet = new Set();
      for (const existing of existingBookings) {
        const seatsArray = Array.isArray(existing.seatNumbers) ? existing.seatNumbers : [];
        seatsArray.forEach((seat) => bookedSeatSet.add(String(seat).trim()));
      }

      const conflictingSeats = uniqueSeatNumbers.filter((seat) => bookedSeatSet.has(seat));
      if (conflictingSeats.length > 0) {
        const conflictError = new Error('Selected seats are no longer available.');
        conflictError.status = 409;
        conflictError.conflicts = conflictingSeats;
        throw conflictError;
      }

      const remainingSeats = trip.availableSeats - uniqueSeatNumbers.length;
      if (remainingSeats < 0) {
        const remainingError = new Error('Not enough seats available.');
        remainingError.status = 409;
        remainingError.availableSeats = trip.availableSeats;
        throw remainingError;
      }

      const bookingCode = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const bookingRecord = await Booking.create(
        {
          bookingCode,
          userId: req.user.id,
          tripId,
          passengerName: passengerName.trim(),
          passengerPhone: passengerPhone.trim(),
          passengerEmail: passengerEmail ? String(passengerEmail).trim() : null,
          seatNumbers: uniqueSeatNumbers,
          totalPrice: totalPriceNumber,
          paymentMethod: sanitizedPaymentMethod,
          paymentStatus: 'PENDING',
          bookingStatus: 'CONFIRMED',
          notes: notes ? String(notes).trim() : null
        },
        { transaction }
      );

      const paymentRecord = await Payment.create(
        {
          paymentCode: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
          bookingId: bookingRecord.id,
          amount: totalPriceNumber,
          paymentMethod: sanitizedPaymentMethod,
          paymentStatus: 'PENDING'
        },
        { transaction }
      );

      await trip.update({ availableSeats: remainingSeats }, { transaction });

      const bookingWithDetails = await Booking.findByPk(bookingRecord.id, {
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
            attributes: { exclude: ['passwordHash'] }
          }
        ],
        transaction
      });

      return {
        booking: bookingWithDetails,
        payment: paymentRecord
      };
    });

    const { booking: bookingWithDetails, payment: paymentRecord } = result;

    if (!bookingWithDetails || !paymentRecord) {
      return res.status(500).json({
        success: false,
        message: 'Unable to create booking at this time.'
      });
    }

    const departureName = bookingWithDetails.trip?.departureLocation?.name || '';
    const arrivalName = bookingWithDetails.trip?.arrivalLocation?.name || '';
    const routeLabel =
      departureName && arrivalName ? `${departureName} -> ${arrivalName}` : bookingWithDetails.trip?.route || '';

    const qrInfo = encodeURIComponent(`Thanh toan don ${bookingWithDetails.bookingCode}`);
    const qrAmount = Number.isFinite(Number(bookingWithDetails.totalPrice))
      ? Number(bookingWithDetails.totalPrice)
      : totalPriceNumber;
    const qrBank = process.env.VIETQR_BANK_CODE || 'VCB';
    const qrAccount = process.env.VIETQR_ACCOUNT_NO || '0000000000';
    const qrAccountName = process.env.VIETQR_ACCOUNT_NAME || 'SHANBUS';

    res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      data: {
        booking: {
          id: bookingWithDetails.id,
          bookingCode: bookingWithDetails.bookingCode,
          passengerName: bookingWithDetails.passengerName,
          passengerPhone: bookingWithDetails.passengerPhone,
          seatNumbers: bookingWithDetails.seatNumbers,
          totalPrice: Number(bookingWithDetails.totalPrice),
          paymentStatus: bookingWithDetails.paymentStatus,
          bookingStatus: bookingWithDetails.bookingStatus,
          createdAt: bookingWithDetails.createdAt
        },
        payment: {
          id: paymentRecord.id,
          paymentCode: paymentRecord.paymentCode,
          amount: Number(paymentRecord.amount),
          paymentMethod: paymentRecord.paymentMethod,
          paymentStatus: paymentRecord.paymentStatus,
          qrImageUrl: `https://img.vietqr.io/image/${qrBank}-${qrAccount}-qr_only.png?amount=${qrAmount}&addInfo=${qrInfo}`,
          vietqr: {
            bankCode: qrBank,
            accountNo: qrAccount,
            accountName: qrAccountName,
            amount: qrAmount,
            addInfo: `Thanh toan don ${bookingWithDetails.bookingCode}`
          }
        },
        trip: {
          id: bookingWithDetails.trip?.id,
          route: routeLabel,
          departureLocation: departureName,
          arrivalLocation: arrivalName,
          departureTime: bookingWithDetails.trip?.departureTime,
          arrivalTime: bookingWithDetails.trip?.arrivalTime,
          availableSeats: bookingWithDetails.trip?.availableSeats,
          bus: bookingWithDetails.trip?.bus
            ? {
                id: bookingWithDetails.trip.bus.id,
                busNumber: bookingWithDetails.trip.bus.busNumber,
                busType: bookingWithDetails.trip.bus.busType,
                totalSeats: bookingWithDetails.trip.bus.totalSeats
              }
            : null
        }
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);

    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Trip not found.'
      });
    }

    if (error.status === 409) {
      return res.status(409).json({
        success: false,
        message: error.message || 'Unable to create booking.',
        conflicts: error.conflicts,
        availableSeats: error.availableSeats
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating booking.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// âœ… Get user bookings (renamed from getUserBookings)
const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

  console.log('🔎 Getting bookings for user:', req.user.id);

    const whereClause = { userId: req.user.id };
    if (status) {
      whereClause.bookingStatus = status;
    }

  const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Bus,
              as: 'bus'
            }
          ]
        },
        {
          model: Payment,
          as: 'payments'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`âœ… Found ${count} bookings for user ${req.user.id}`);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('âŒ Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách đặt vé',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// âœ… Get booking by ID (renamed from getBookingByCode)
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

  console.log('🔎 Getting booking:', id);

    const booking = await Booking.findOne({
      where: { 
        id,
        userId: req.user.id // Ensure user can only access their own bookings
      },
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Bus,
              as: 'bus'
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['passwordHash'] }
        },
        {
          model: Payment,
          as: 'payments'
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé đặt'
      });
    }

    console.log('âœ… Booking found:', booking.id);

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('✖ Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin vé đặt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// âœ… Get booking by code (additional function)
const getBookingByCode = async (req, res) => {
  try {
    const { code } = req.params;

  console.log('🔎 Getting booking by code:', code);

    const booking = await Booking.findOne({
      where: { 
        bookingCode: code,
        userId: req.user.id
      },
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Bus,
              as: 'bus'
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['passwordHash'] }
        },
        {
          model: Payment,
          as: 'payments'
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé đặt với mã này'
      });
    }

    console.log('âœ… Booking found by code:', booking.id);

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('✖ Get booking by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin vé đặt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// âœ… Update booking status (new function)
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

  console.log('🔄 Updating booking status:', { id, status, paymentStatus });

    const booking = await Booking.findOne({
      where: { 
        id,
        userId: req.user.id
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé đặt'
      });
    }

    // Update fields if provided
    const updates = {};
    if (status) updates.bookingStatus = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await booking.update(updates);

  console.log('✅ Booking status updated:', booking.id);

    // Fetch updated booking with relations
    const updatedBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Bus,
              as: 'bus'
            }
          ]
        },
        {
          model: Payment,
          as: 'payments'
        }
      ]
    });

    res.json({
      success: true,
      message: 'Cập nhật trạng thái vé thành công',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('✖ Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái vé',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// âœ… Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('booking.controller#cancelBooking payload:', id);

    const booking = await sequelize.transaction(async (transaction) => {
      const record = await Booking.findOne({
        where: {
          id,
          userId: req.user.id
        },
        include: [
          {
            model: Trip,
            as: 'trip'
          }
        ],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!record) {
        const notFoundError = new Error('Booking not found.');
        notFoundError.status = 404;
        throw notFoundError;
      }

      if (record.bookingStatus === 'CANCELLED') {
        const duplicateError = new Error('Booking has already been cancelled.');
        duplicateError.status = 400;
        throw duplicateError;
      }

      if (record.bookingStatus === 'COMPLETED') {
        const completedError = new Error('Completed bookings cannot be cancelled.');
        completedError.status = 400;
        throw completedError;
      }

      const now = Date.now();
      const departureTime = record.trip ? new Date(record.trip.departureTime).getTime() : undefined;
      if (Number.isFinite(departureTime)) {
        const hoursUntilTrip = (departureTime - now) / (1000 * 60 * 60);
        if (hoursUntilTrip < 2) {
          const windowError = new Error('Bookings can only be cancelled up to 2 hours before departure.');
          windowError.status = 400;
          throw windowError;
        }
      }

      const tripInstance = record.trip || await Trip.findByPk(record.tripId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const seatsToRelease = Array.isArray(record.seatNumbers) ? record.seatNumbers.length : 0;
      if (tripInstance) {
        const updatedSeats = Math.min(
          tripInstance.totalSeats,
          tripInstance.availableSeats + seatsToRelease
        );
        await tripInstance.update({ availableSeats: updatedSeats }, { transaction });
      }

      const updatedBooking = await record.update(
        {
          bookingStatus: 'CANCELLED',
          paymentStatus: record.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED'
        },
        { transaction }
      );

      return updatedBooking;
    });

    console.log('booking.controller#cancelBooking completed:', booking.id);

    res.json({
      success: true,
      message: 'Booking cancelled successfully.',
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus
      }
    });
  } catch (error) {
  console.error('✖ Cancel booking error:', error);

    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Booking not found.'
      });
    }

    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Unable to cancel booking.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while cancelling booking.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// âœ… Process payment (supports /payment/:paymentId/process)
const processPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, amount, paymentId } = req.body;

  console.log('🔄 Processing payment:', { bookingId, paymentMethod, amount });

    // Find booking (by bookingId or by paymentId)
    let booking = null;
    if (bookingId) {
      booking = await Booking.findOne({
        where: { id: bookingId, userId: req.user.id }
      });
    } else if (paymentId) {
      const existingPayment = await Payment.findByPk(paymentId);
      if (existingPayment) {
        booking = await Booking.findOne({ where: { id: existingPayment.bookingId, userId: req.user.id } });
      }
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé đặt'
      });
    }

    // If paymentId provided, update that payment; else create a new one
    let payment;
    if (paymentId) {
      payment = await Payment.findByPk(paymentId);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch thanh toán' });
      }
      await payment.update({
        amount,
        paymentMethod,
        paymentStatus: 'SUCCESS',
        transactionId: `TXN${Date.now()}`,
        paidAt: new Date()
      });
    } else {
      payment = await Payment.create({
        paymentCode: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
        bookingId: booking.id,
        amount,
        paymentMethod,
        paymentStatus: 'SUCCESS', // Mock success for now
        transactionId: `TXN${Date.now()}`,
        paidAt: new Date()
      });
    }

    // Update booking payment status
    await booking.update({
      paymentStatus: 'PAID',
      paymentMethod
    });

  console.log('✅ Payment processed:', payment.id);

    const bookingWithTrip = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Trip,
          as: 'trip'
        }
      ]
    });

    res.json({
      success: true,
      message: 'Thanh toán thành công',
      data: {
        payment: {
          id: payment.id,
          paymentCode: payment.paymentCode,
          paymentStatus: payment.paymentStatus,
          paidAt: payment.paidAt
        },
        booking: {
          bookingCode: bookingWithTrip.bookingCode,
          paymentStatus: bookingWithTrip.paymentStatus
        }
      }
    });

  } catch (error) {
    console.error('✖ Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xử lý thanh toán',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// âœ… Export all functions matching the import in routes
module.exports = {
  createBooking,
  getBookings,         // âœ… Renamed from getUserBookings
  getBookingById,      // âœ… Renamed from getBookingByCode but keeping both
  getBookingByCode,    // âœ… Keep this for backward compatibility
  updateBookingStatus, // âœ… New function
  cancelBooking,
  processPayment
};



