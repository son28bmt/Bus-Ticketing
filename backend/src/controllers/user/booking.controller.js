'use strict';

const {
  Booking,
  Trip,
  User,
  Bus,
  Payment,
  Location,
  Seat,
  BookingItem,
  SeatLock,
  Route,
  Invoice,
  PaymentLog,
  sequelize,
  Voucher
} = require('../../../models');

const { Op } = require('sequelize');
const mailService = require('../../services/mail.service');
const voucherService = require('../../services/voucher.service');

const VALID_PAYMENT_METHODS = new Set(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET', 'VNPAY']);
const logPaymentEvent = async (
  { paymentId, eventType, status = 'INFO', payload = {}, response = {}, errorMessage },
  options = {}
) => {
  if (!paymentId) {
    return;
  }

  try {
    await PaymentLog.create(
      {
        paymentId,
        eventType,
        status,
        payload,
        response,
        errorMessage
      },
      { transaction: options.transaction }
    );
  } catch (logError) {
    console.error('booking.controller#logPaymentEvent error:', logError.message);
  }
};

const ensureInvoiceRecord = async (payment, booking, options = {}) => {
  if (!payment || !booking) {
    return null;
  }

  try {
    const existingInvoice = await Invoice.findOne({
      where: { paymentId: payment.id },
      transaction: options.transaction
    });

    const subtotal = Number(payment.amount) || 0;
    const issuedAt = payment.paidAt || new Date();

    if (existingInvoice) {
      if (payment.paymentStatus === 'SUCCESS' && existingInvoice.status !== 'ISSUED') {
        await existingInvoice.update(
          {
            status: 'ISSUED',
            issuedAt,
            subtotal,
            totalAmount: subtotal
          },
          { transaction: options.transaction }
        );
      }

      return existingInvoice;
    }

    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${payment.paymentCode}`;

    return await Invoice.create(
      {
        invoiceNumber,
        companyId: booking.companyId,
        bookingId: booking.id,
        paymentId: payment.id,
        status: payment.paymentStatus === 'SUCCESS' ? 'ISSUED' : 'DRAFT',
        subtotal,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: subtotal,
        issuedAt,
        metadata: {
          seats: booking.seatNumbers,
          seatCount: Array.isArray(booking.seatNumbers) ? booking.seatNumbers.length : 1
        }
      },
      { transaction: options.transaction }
    );
  } catch (invoiceError) {
    console.error('booking.controller#ensureInvoiceRecord error:', invoiceError.message);
    return null;
  }
};

const toPlain = (value) => (value && typeof value.toJSON === 'function' ? value.toJSON() : value);

const normalizeLocation = (location) => {
  if (!location) {
    return { label: '', details: null };
  }

  if (typeof location === 'string') {
    return { label: location, details: null };
  }

  const details = toPlain(location);
  return {
    label: details?.name || '',
    details
  };
};

const buildRouteLabel = ({ departure, arrival, routeMeta }) => {
  if (departure && arrival) {
    return `${departure} -> ${arrival}`;
  }

  if (routeMeta?.fromLocationId != null && routeMeta?.toLocationId != null) {
    return `${routeMeta.fromLocationId} -> ${routeMeta.toLocationId}`;
  }

  return '';
};

const serializeTripPayload = (tripInstance) => {
  const plainTrip = toPlain(tripInstance);
  if (!plainTrip) {
    return null;
  }

  const departure = normalizeLocation(plainTrip.departureLocation);
  const arrival = normalizeLocation(plainTrip.arrivalLocation);
  const routeMeta = plainTrip.route ? toPlain(plainTrip.route) : null;

  return {
    ...plainTrip,
    departureLocation: departure.label,
    arrivalLocation: arrival.label,
    departureLocationDetails: departure.details,
    arrivalLocationDetails: arrival.details,
    route: buildRouteLabel({ departure: departure.label, arrival: arrival.label, routeMeta }),
    routeMeta
  };
};

const serializeBookingPayload = (bookingInstance) => {
  const plainBooking = toPlain(bookingInstance);
  if (!plainBooking) {
    return null;
  }

  plainBooking.totalPrice = Number(plainBooking.totalPrice) || 0;
  plainBooking.discountAmount = Number(plainBooking.discountAmount) || 0;
  plainBooking.payableAmount = Math.max(0, plainBooking.totalPrice - plainBooking.discountAmount);

  if (plainBooking.trip) {
    plainBooking.trip = serializeTripPayload(plainBooking.trip);
  }

  if (Array.isArray(plainBooking.items)) {
    plainBooking.items = plainBooking.items.map((item) => {
      const plainItem = toPlain(item);
      if (plainItem?.seat) {
        plainItem.seat = toPlain(plainItem.seat);
      }
      return plainItem;
    });
  }

  if (Array.isArray(plainBooking.payments)) {
    plainBooking.payments = plainBooking.payments.map((payment) => {
      const plainPayment = toPlain(payment);
      plainPayment.amount = Number(plainPayment.amount) || 0;
      if (plainPayment.discountAmount != null) {
        plainPayment.discountAmount = Number(plainPayment.discountAmount) || 0;
      }
      if (plainPayment.voucher) {
        plainPayment.voucher = toPlain(plainPayment.voucher);
      }
      return plainPayment;
    });
  }

  if (plainBooking.voucher) {
    plainBooking.voucher = toPlain(plainBooking.voucher);
  }

  if (plainBooking.user) {
    plainBooking.user = toPlain(plainBooking.user);
  }

  return plainBooking;
};

const getSeatPrice = (basePrice, seat) => {
  const multiplier = Number(seat?.priceMultiplier ?? 1);
  const computedPrice = Number(basePrice) * multiplier;
  return Number.isFinite(computedPrice) && computedPrice > 0 ? computedPrice : Number(basePrice) || 0;
};

// Create new booking
const createBooking = async (req, res) => {
  const {
    tripId,
    passengerName,
    passengerPhone,
    passengerEmail,
    seatNumbers,
    totalPrice,
    paymentMethod,
    notes,
    voucherCode,
    guestNotes
  } = req.body || {};

  const currentUserId = req.user?.id ?? null;

  console.log('user.booking#createBooking payload:', {
    tripId,
    passengerName,
    seatCount: Array.isArray(seatNumbers) ? seatNumbers.length : 1,
    hasUser: currentUserId != null
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

  if (!tripId || !passengerName || !passengerPhone || normalizedSeats.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing required booking information.',
      required: ['tripId', 'passengerName', 'passengerPhone', 'seatNumbers']
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

  const numericTotalFromRequest = Number(totalPrice);
  if (Number.isFinite(numericTotalFromRequest) && numericTotalFromRequest < 0) {
    return res.status(400).json({
      success: false,
      message: 'Total price must be a positive number.'
    });
  }

  const sanitizedPaymentMethod = VALID_PAYMENT_METHODS.has(paymentMethod) ? paymentMethod : 'BANK_TRANSFER';

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const trip = await Trip.findByPk(tripId, {
        include: [
          {
            model: Bus,
            as: 'bus',
            attributes: ['id', 'companyId', 'busNumber', 'busType']
          }
        ],
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

      if (trip.availableSeats == null) {
        const invalidTripError = new Error('Trip is missing seat availability information.');
        invalidTripError.status = 500;
        throw invalidTripError;
      }

      if (trip.availableSeats < uniqueSeatNumbers.length) {
        const capacityError = new Error('Not enough seats available.');
        capacityError.status = 409;
        capacityError.availableSeats = trip.availableSeats;
        throw capacityError;
      }

      const resolvedBusId = trip.busId ?? trip.bus?.id;
      if (!resolvedBusId) {
        const missingBusError = new Error('Trip does not have a bus assigned.');
        missingBusError.status = 400;
        throw missingBusError;
      }

      const resolvedCompanyId = trip.companyId ?? trip.bus?.companyId;
      if (!resolvedCompanyId) {
        const missingCompanyError = new Error('Trip does not have a company assigned.');
        missingCompanyError.status = 400;
        throw missingCompanyError;
      }

      const seats = await Seat.findAll({
        where: {
          busId: resolvedBusId,
          seatNumber: { [Op.in]: uniqueSeatNumbers }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (seats.length !== uniqueSeatNumbers.length) {
        const missingSeats = uniqueSeatNumbers.filter(
          (seatNumber) => !seats.some((seat) => String(seat.seatNumber) === String(seatNumber))
        );
        const seatError = new Error('One or more selected seats are not available for this bus.');
        seatError.status = 400;
        seatError.missingSeats = missingSeats;
        throw seatError;
      }

      const seatIds = seats.map((seat) => seat.id);

      const activeLocks = await SeatLock.findAll({
        where: {
          tripId,
          seatId: { [Op.in]: seatIds },
          expiresAt: { [Op.gt]: new Date() }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const requestingUserId = currentUserId;
      const conflictingLocks = activeLocks.filter((lock) => {
        if (requestingUserId != null && lock.userId != null) {
          return Number(lock.userId) !== Number(requestingUserId);
        }
        if (requestingUserId == null && lock.userId == null) {
          return false;
        }
        return lock.userId != null;
      });

      if (conflictingLocks.length > 0) {
        const lockedSeatIds = new Set(conflictingLocks.map((lock) => lock.seatId));
        const lockedSeatNumbers = seats
          .filter((seat) => lockedSeatIds.has(seat.id))
          .map((seat) => String(seat.seatNumber));
        const lockError = new Error('Selected seats are temporarily locked by another user.');
        lockError.status = 409;
        lockError.conflicts = lockedSeatNumbers;
        throw lockError;
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

      const computedSeatTotal = seats.reduce(
        (total, seat) => total + getSeatPrice(trip.basePrice, seat),
        0
      );
      const orderAmount = Number.isFinite(computedSeatTotal) && computedSeatTotal > 0
        ? Number(computedSeatTotal.toFixed(2))
        : Number.isFinite(numericTotalFromRequest) && numericTotalFromRequest > 0
        ? Number(numericTotalFromRequest.toFixed(2))
        : 0;

      if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
        const priceError = new Error('Unable to calculate booking total.');
        priceError.status = 400;
        throw priceError;
      }

      let appliedVoucher = null;
      let discountAmount = 0;
      let voucherPayload = null;

      const normalizedVoucherCode =
        typeof voucherCode === 'string' ? voucherCode.trim().toUpperCase() : '';

      if (normalizedVoucherCode) {
        const voucherResult = await voucherService.validateVoucher({
          code: normalizedVoucherCode,
          companyId: resolvedCompanyId,
          orderAmount,
          userId: currentUserId,
          requireCompanyMatch: true,
          transaction
        });

        if (!voucherResult.valid) {
          const voucherError = new Error(
            voucherResult.reason || 'Voucher is not valid for this booking.'
          );
          voucherError.status = 400;
          throw voucherError;
        }

        appliedVoucher = voucherResult.voucher;
        discountAmount = Number(voucherResult.discount) || 0;
        voucherPayload = voucherResult.payload;
      }

      const payableAmount = Math.max(orderAmount - discountAmount, 0);

      const bookingCode = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const normalizedGuestNotes =
        guestNotes && typeof guestNotes === 'object'
          ? guestNotes
          : guestNotes
          ? { note: String(guestNotes) }
          : null;

      const bookingRecord = await Booking.create(
        {
          bookingCode,
          userId: currentUserId,
          tripId,
          companyId: resolvedCompanyId,
          passengerName: passengerName.trim(),
          passengerPhone: passengerPhone.trim(),
          passengerEmail: passengerEmail ? String(passengerEmail).trim() : null,
          seatNumbers: uniqueSeatNumbers,
          totalPrice: orderAmount,
          discountAmount,
          voucherId: appliedVoucher ? appliedVoucher.id : null,
          paymentMethod: sanitizedPaymentMethod,
          paymentStatus: 'PENDING',
          bookingStatus: 'CONFIRMED',
          notes: notes ? String(notes).trim() : null,
          guestNotes: normalizedGuestNotes || (!currentUserId ? { createdAsGuest: true } : null)
        },
        { transaction }
      );

      await BookingItem.bulkCreate(
        seats.map((seat) => ({
          bookingId: bookingRecord.id,
          seatId: seat.id,
          price: getSeatPrice(trip.basePrice, seat)
        })),
        { transaction }
      );

      const seatLockCriteria = {
        tripId,
        seatId: { [Op.in]: seatIds }
      };

      if (currentUserId != null) {
        seatLockCriteria.userId = currentUserId;
      }

      await SeatLock.destroy({
        where: seatLockCriteria,
        transaction
      });

      if (appliedVoucher) {
        await voucherService.createVoucherUsage({
          voucher: appliedVoucher,
          booking: bookingRecord,
          userId: currentUserId,
          discountAmount,
          metadata: {
            code: appliedVoucher.code,
            source: currentUserId ? 'USER' : 'GUEST'
          },
          transaction
        });
      }

      const paymentRecord = await Payment.create(
        {
          paymentCode: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
          bookingId: bookingRecord.id,
          companyId: resolvedCompanyId,
          amount: payableAmount,
          paymentMethod: sanitizedPaymentMethod,
          paymentStatus: 'PENDING',
          voucherId: appliedVoucher ? appliedVoucher.id : null,
          discountAmount
        },
        { transaction }
      );

      await logPaymentEvent(
        {
          paymentId: paymentRecord.id,
          eventType: 'BOOKING_PAYMENT_INIT',
          status: 'INFO',
          payload: {
            bookingId: bookingRecord.id,
            userId: currentUserId,
            amount: payableAmount,
            paymentMethod: sanitizedPaymentMethod,
            discountAmount
          }
        },
        { transaction }
      );

      await ensureInvoiceRecord(paymentRecord, bookingRecord, { transaction });

      await trip.update({ availableSeats: remainingSeats }, { transaction });

      const bookingWithDetails = await Booking.findByPk(bookingRecord.id, {
        include: buildBookingsQueryInclude({ includePayments: true }),
        transaction
      });

      return {
        booking: bookingWithDetails,
        payment: paymentRecord,
        voucher: voucherPayload
      };
    });

    const { booking: bookingWithDetails, payment: paymentRecord, voucher: voucherPayload } =
      result || {};

    if (!bookingWithDetails || !paymentRecord) {
      return res.status(500).json({
        success: false,
        message: 'Unable to create booking at this time.'
      });
    }

    const bookingPayload = serializeBookingPayload(bookingWithDetails);
    const paymentPayload = toPlain(paymentRecord);
    const tripPayload = bookingPayload.trip || null;

    const payableAmount =
      Number(paymentPayload.amount) ||
      Math.max(0, bookingPayload.totalPrice - bookingPayload.discountAmount);

    const qrInfo = encodeURIComponent(`Thanh toan don ${bookingPayload.bookingCode}`);
    const qrBank = process.env.VIETQR_BANK_CODE || 'VCB';
    const qrAccount = process.env.VIETQR_ACCOUNT_NO || '0000000000';
    const qrAccountName = process.env.VIETQR_ACCOUNT_NAME || 'SHANBUS';

    const recipientEmail =
      (bookingPayload.passengerEmail && bookingPayload.passengerEmail.trim()) ||
      (req.user && req.user.email);

    if (recipientEmail) {
      mailService
        .sendBookingConfirmation(bookingWithDetails, {
          email: recipientEmail,
          name: bookingPayload.passengerName,
          discountAmount: bookingPayload.discountAmount,
          voucher: voucherPayload
        })
        .catch((err) => {
          console.warn('booking.confirmation email failed', err);
        });
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      data: {
        booking: bookingPayload,
        payment: {
          id: paymentPayload.id,
          paymentCode: paymentPayload.paymentCode,
          amount: payableAmount,
          discountAmount: Number(paymentPayload.discountAmount || 0),
          paymentMethod: paymentPayload.paymentMethod,
          paymentStatus: paymentPayload.paymentStatus,
          voucherId: paymentPayload.voucherId,
          qrImageUrl: `https://img.vietqr.io/image/${qrBank}-${qrAccount}-qr_only.png?amount=${payableAmount}&addInfo=${qrInfo}`,
          vietqr: {
            bankCode: qrBank,
            accountNo: qrAccount,
            accountName: qrAccountName,
            amount: payableAmount,
            addInfo: `Thanh toan don ${bookingPayload.bookingCode}`
          }
        },
        trip: tripPayload,
        voucher: voucherPayload
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

    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid booking data.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating booking.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const buildBookingsQueryInclude = ({ includePayments = true } = {}) => {
  const includes = [
    {
      model: Trip,
      as: 'trip',
      include: [
        { model: Bus, as: 'bus' },
        { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
        { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
        { model: Route, as: 'route' }
      ]
    },
    {
      model: BookingItem,
      as: 'items',
      include: [
        {
          model: Seat,
          as: 'seat',
          attributes: ['id', 'seatNumber', 'seatType', 'priceMultiplier']
        }
      ]
    },
    {
      model: User,
      as: 'user',
      attributes: { exclude: ['passwordHash'] }
    },
    {
      model: Voucher,
      as: 'voucher'
    }
  ];

  if (includePayments) {
    includes.push({
      model: Payment,
      as: 'payments',
      include: [
        {
          model: Voucher,
          as: 'voucher'
        }
      ]
    });
  }

  return includes;
};

const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.user.id };
    if (status) {
      whereClause.bookingStatus = status;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: buildBookingsQueryInclude(),
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    console.log(`✅ Found ${count} bookings for user ${req.user.id}`);

    const serializedBookings = bookings.map(serializeBookingPayload);

    res.json({
      success: true,
      data: {
        bookings: serializedBookings,
        pagination: {
          total: count,
          page: parseInt(page, 10),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit, 10)
        }
      }
    });
  } catch (error) {
    console.error('✖ Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách đặt vé',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const findBookingForUser = async (whereClause) =>
  Booking.findOne({
    where: whereClause,
    include: buildBookingsQueryInclude()
  });

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Getting booking:', id);

    const booking = await findBookingForUser({
      id,
      userId: req.user.id
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
      booking: serializeBookingPayload(booking)
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

const getBookingByCode = async (req, res) => {
  try {
    const { code } = req.params;

    console.log('🔍 Getting booking by code:', code);

    const booking = await findBookingForUser({
      bookingCode: code,
      userId: req.user.id
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
      booking: serializeBookingPayload(booking)
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

    const updates = {};
    if (status) updates.bookingStatus = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await booking.update(updates);

    console.log('✅ Booking status updated:', booking.id);

    const updatedBooking = await findBookingForUser({
      id: booking.id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Cập nhật trạng thái vé thành công',
      booking: serializeBookingPayload(updatedBooking)
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

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('user.booking#cancelBooking payload:', id);

    const booking = await sequelize.transaction(async (transaction) => {
      const record = await Booking.findOne({
        where: {
          id,
          userId: req.user.id
        },
        include: [
          {
            model: Trip,
            as: 'trip',
            lock: transaction.LOCK.UPDATE
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

      const tripInstance =
        record.trip ||
        (await Trip.findByPk(record.tripId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        }));

      const seatsToRelease = Array.isArray(record.seatNumbers) ? record.seatNumbers.length : 0;
      if (tripInstance) {
        const updatedSeats = Math.min(tripInstance.totalSeats, tripInstance.availableSeats + seatsToRelease);
        await tripInstance.update({ availableSeats: updatedSeats }, { transaction });
      }

      const updatedBooking = await record.update(
        {
          bookingStatus: 'CANCELLED',
          paymentStatus: record.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED'
        },
        { transaction }
      );

      return updatedBooking.id;
    });

    console.log('user.booking#cancelBooking completed:', booking);

    const hydratedBooking = await findBookingForUser({
      id: booking,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully.',
      booking: serializeBookingPayload(hydratedBooking)
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

const processPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, amount, paymentId } = req.body;

    console.log('Processing payment:', { bookingId, paymentMethod, amount });

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
        message: 'Khong tim thay ve dat'
      });
    }

    const bookingTotal = Number(booking.totalPrice) || 0;
    const bookingDiscount = Number(booking.discountAmount) || 0;
    const payableAmount = Math.max(0, bookingTotal - bookingDiscount);
    const normalizedAmount = Number(amount) > 0 ? Number(amount) : payableAmount;

    let payment;
    if (paymentId) {
      payment = await Payment.findByPk(paymentId);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Khong tim thay giao dich thanh toan' });
      }
      await payment.update({
        amount: normalizedAmount,
        discountAmount: bookingDiscount,
        voucherId: booking.voucherId || payment.voucherId || null,
        paymentMethod,
        paymentStatus: 'SUCCESS',
        transactionId: `TXN${Date.now()}`,
        paidAt: new Date()
      });
    } else {
      payment = await Payment.create({
        paymentCode: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
        bookingId: booking.id,
        companyId: booking.companyId,
        amount: normalizedAmount,
        discountAmount: bookingDiscount,
        voucherId: booking.voucherId || null,
        paymentMethod,
        paymentStatus: 'SUCCESS',
        transactionId: `TXN${Date.now()}`,
        paidAt: new Date()
      });
    }

    await booking.update({
      paymentStatus: 'PAID',
      paymentMethod
    });

    await ensureInvoiceRecord(payment, booking);

    await logPaymentEvent({
      paymentId: payment.id,
      eventType: 'MANUAL_PAYMENT_SUCCESS',
      status: 'SUCCESS',
      payload: { bookingId: booking.id, amount: normalizedAmount, paymentMethod, discountAmount: bookingDiscount }
    });

    console.log('Payment processed:', payment.id);

    const bookingWithTrip = await Booking.findByPk(booking.id, {
      include: buildBookingsQueryInclude()
    });

    res.json({
      success: true,
      message: 'Thanh toan thanh cong',
      data: {
        payment: {
          id: payment.id,
          paymentCode: payment.paymentCode,
          paymentStatus: payment.paymentStatus,
          paidAt: payment.paidAt,
          amount: Number(payment.amount) || 0,
          discountAmount: Number(payment.discountAmount) || 0
        },
        booking: serializeBookingPayload(bookingWithTrip)
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi server khi xu ly thanh toan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  getBookingByCode,
  updateBookingStatus,
  cancelBooking,
  processPayment,
  serializeBookingPayload,
  buildBookingsQueryInclude
};


