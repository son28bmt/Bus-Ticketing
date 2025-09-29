const { Booking, Trip, User, Bus, Payment } = require('../../models');
const { Op } = require('sequelize');

// ✅ Create new booking
const createBooking = async (req, res) => {
  try {
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

    console.log('🔄 Creating booking:', { tripId, passengerName, seatNumbers });

    // Validation
    if (!tripId || !passengerName || !passengerPhone || !seatNumbers || !totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
        required: ['tripId', 'passengerName', 'passengerPhone', 'seatNumbers', 'totalPrice']
      });
    }

    // Check if trip exists
    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến xe'
      });
    }

    // Generate unique booking code
    const bookingCode = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create booking
    const booking = await Booking.create({
      bookingCode,
      userId: req.user.id,
      tripId,
      passengerName,
      passengerPhone,
      passengerEmail,
      seatNumbers: Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers],
      totalPrice,
      paymentMethod: paymentMethod || 'CASH',
      paymentStatus: 'PENDING',
      bookingStatus: 'CONFIRMED',
      notes
    });

    console.log('✅ Booking created successfully:', booking.id);

    // Fetch booking with relations
    const bookingWithDetails = await Booking.findByPk(booking.id, {
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
        }
      ]
    });

    // Create initial payment record (PENDING)
    const payment = await Payment.create({
      paymentCode: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
      bookingId: booking.id,
      amount: totalPrice,
      paymentMethod: paymentMethod || 'BANK_TRANSFER',
      paymentStatus: 'PENDING'
    });

    // Prepare simplified response structure
    res.status(201).json({
      success: true,
      message: 'Đặt vé thành công',
      data: {
        booking: {
          id: bookingWithDetails.id,
          bookingCode: bookingWithDetails.bookingCode,
          passengerName: bookingWithDetails.passengerName,
          passengerPhone: bookingWithDetails.passengerPhone,
          seatNumbers: bookingWithDetails.seatNumbers,
          totalPrice: bookingWithDetails.totalPrice,
          paymentStatus: bookingWithDetails.paymentStatus,
          bookingStatus: bookingWithDetails.bookingStatus,
          createdAt: bookingWithDetails.createdAt
        },
        payment: {
          id: payment.id,
          paymentCode: payment.paymentCode,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.paymentStatus,
          qrImageUrl: (() => {
            const bank = process.env.VIETQR_BANK_CODE || 'VCB';
            const acc = process.env.VIETQR_ACCOUNT_NO || '0000000000';
            const info = encodeURIComponent(`Thanh toan don ${bookingWithDetails.bookingCode}`);
            const amt = Number(totalPrice) || 0;
            return `https://img.vietqr.io/image/${bank}-${acc}-qr_only.png?amount=${amt}&addInfo=${info}`;
          })(),
          // VietQR-compatible fields (client will build QR)
          vietqr: {
            bankCode: process.env.VIETQR_BANK_CODE || 'VCB',
            accountNo: process.env.VIETQR_ACCOUNT_NO || '0000000000',
            accountName: process.env.VIETQR_ACCOUNT_NAME || 'SHANBUS',
            amount: totalPrice,
            addInfo: `Thanh toan don ${bookingWithDetails.bookingCode}`
          }
        },
        trip: {
          id: bookingWithDetails.trip.id,
          route: `${bookingWithDetails.trip?.departureLocation?.name || ''} -> ${bookingWithDetails.trip?.arrivalLocation?.name || ''}`,
          departureLocation: bookingWithDetails.trip?.departureLocation?.name || '',
          arrivalLocation: bookingWithDetails.trip?.arrivalLocation?.name || '',
          departureTime: bookingWithDetails.trip.departureTime,
          arrivalTime: bookingWithDetails.trip.arrivalTime
        }
      }
    });

  } catch (error) {
    console.error('❌ Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đặt vé',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Get user bookings (renamed from getUserBookings)
const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    console.log('🔄 Getting bookings for user:', req.user.id);

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

    console.log(`✅ Found ${count} bookings for user ${req.user.id}`);

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
    console.error('❌ Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách đặt vé',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Get booking by ID (renamed from getBookingByCode)
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔄 Getting booking:', id);

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

    console.log('✅ Booking found:', booking.id);

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('❌ Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin vé đặt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Get booking by code (additional function)
const getBookingByCode = async (req, res) => {
  try {
    const { code } = req.params;

    console.log('🔄 Getting booking by code:', code);

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

    console.log('✅ Booking found by code:', booking.id);

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('❌ Get booking by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin vé đặt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Update booking status (new function)
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
    console.error('❌ Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái vé',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔄 Cancelling booking:', id);

    const booking = await Booking.findOne({
      where: { 
        id,
        userId: req.user.id
      },
      include: [
        {
          model: Trip,
          as: 'trip'
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé đặt'
      });
    }

    // Check if booking can be cancelled
    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Vé đã bị hủy trước đó'
      });
    }

    if (booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy vé đã hoàn thành'
      });
    }

    // Check if trip has already started
    const now = new Date();
    const tripDate = new Date(booking.trip.departureTime);
    const timeDiff = tripDate - now;
    const hoursUntilTrip = timeDiff / (1000 * 60 * 60);

    if (hoursUntilTrip < 2) {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy vé trong vòng 2 giờ trước giờ khởi hành'
      });
    }

    // Update booking status
    await booking.update({
      bookingStatus: 'CANCELLED',
      paymentStatus: booking.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED'
    });

    console.log('✅ Booking cancelled:', booking.id);

    res.json({
      success: true,
      message: 'Hủy vé thành công',
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        bookingStatus: 'CANCELLED',
        paymentStatus: booking.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED'
      }
    });

  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi hủy vé',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Process payment (supports /payment/:paymentId/process)
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
    console.error('❌ Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xử lý thanh toán',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Export all functions matching the import in routes
module.exports = {
  createBooking,
  getBookings,         // ✅ Renamed from getUserBookings
  getBookingById,      // ✅ Renamed from getBookingByCode but keeping both
  getBookingByCode,    // ✅ Keep this for backward compatibility
  updateBookingStatus, // ✅ New function
  cancelBooking,
  processPayment
};