const { Payment, Booking, Trip, VNPayTransaction, User, Location, Bus, Route, Invoice, PaymentLog } = require('../../../models');
const VNPayService = require('../../services/vnpay.service');
const moment = require('moment');
const { serializeBookingPayload, buildBookingsQueryInclude } = require('./booking.controller');

const vnpayService = new VNPayService();

const recordPaymentLog = async ({ paymentId, eventType, status = 'INFO', payload = {}, response = {}, errorMessage }) => {
  if (!paymentId) {
    return;
  }

  try {
    await PaymentLog.create({
      paymentId,
      eventType,
      status,
      payload,
      response,
      errorMessage
    });
  } catch (logError) {
    console.error('payment.controller#recordPaymentLog failed:', logError.message);
  }
};

const ensureInvoiceForPayment = async (payment, booking) => {
  if (!payment || !booking) {
    return null;
  }

  try {
    const existingInvoice = await Invoice.findOne({ where: { paymentId: payment.id } });
    const subtotal = Number(payment.amount) || 0;
    const issuedAt = payment.paidAt || new Date();

    if (existingInvoice) {
      if (payment.paymentStatus === 'SUCCESS' && existingInvoice.status !== 'ISSUED') {
        await existingInvoice.update({
          status: 'ISSUED',
          issuedAt,
          subtotal,
          totalAmount: subtotal
        });
      }
      return existingInvoice;
    }

    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${payment.paymentCode}`;

    return await Invoice.create({
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
    });
  } catch (invoiceError) {
    console.error('payment.controller#ensureInvoiceForPayment failed:', invoiceError.message);
    return null;
  }
};

// ✅ Tạo URL thanh toán VNPay
const createVNPayUrl = async (req, res) => {
  try {
    const { bookingId, bankCode } = req.body;

    console.log('🔄 Creating VNPay URL for booking:', bookingId);

    // Tìm booking
    const booking = await Booking.findOne({
      where: { id: bookingId, userId: req.user.id },
      include: buildBookingsQueryInclude()
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé đặt'
      });
    }

    if (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Vé đã được thanh toán'
      });
    }

        const normalizedAmount = Number(booking.totalPrice) || 0;

// Tạo hoặc cập nhật payment record
    let payment = await Payment.findOne({ 
      where: { bookingId: booking.id, paymentStatus: 'PENDING' } 
    });
    
    if (!payment) {
      payment = await Payment.create({
        paymentCode: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
        bookingId: booking.id,
        companyId: booking.companyId,
        amount: normalizedAmount,
        paymentMethod: 'VNPAY',
        paymentStatus: 'PENDING'
      });
    } else {
      const paymentUpdates = {};
      if (payment.companyId !== booking.companyId) {
        paymentUpdates.companyId = booking.companyId;
      }
      if (Number(payment.amount) !== normalizedAmount) {
        paymentUpdates.amount = normalizedAmount;
      }
      if (Object.keys(paymentUpdates).length > 0) {
        await payment.update(paymentUpdates);
      }
    }

    // Tạo VNPay transaction record
    const vnpayTransaction = await VNPayTransaction.create({
      paymentId: payment.id,
      orderId: `${booking.bookingCode}_${Date.now()}`,
      amount: normalizedAmount,
      orderInfo: `Thanh toan ve xe ${booking.bookingCode} - ${booking.passengerName}`,
      bankCode,
      status: 'PENDING'
    });

    // Tạo VNPay URL
    const rawIp =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1';

    const ipCandidate = Array.isArray(rawIp) ? rawIp[0] : String(rawIp || '');
    const ipAddrRaw = ipCandidate.includes(':') ? ipCandidate.split(':').pop() : ipCandidate;
    const ipAddr = ipAddrRaw && ipAddrRaw.trim() !== '' ? ipAddrRaw.trim() : '127.0.0.1';

    const paymentUrl = vnpayService.createPaymentUrl({
      orderId: vnpayTransaction.orderId,
      amount: normalizedAmount,
      orderDescription: vnpayTransaction.orderInfo,
      ipAddr,
      bankCode,
      locale: 'vn'
    });

    // Cập nhật VNPay transaction với URL
    await vnpayTransaction.update({
      paymentUrl
    });

    await recordPaymentLog({
      paymentId: payment.id,
      eventType: 'CREATE_VNPAY_URL',
      status: 'INFO',
      payload: { bookingId, bankCode },
      response: { paymentUrl, vnpayTransactionId: vnpayTransaction.id }
    });

    console.log('✅ VNPay URL created successfully:', vnpayTransaction.orderId);

    res.json({
      success: true,
      message: 'Tạo URL thanh toán VNPay thành công',
      data: {
        paymentUrl,
        orderId: vnpayTransaction.orderId,
        amount: normalizedAmount,
        paymentId: payment.id,
        vnpayTransactionId: vnpayTransaction.id,
        booking: serializeBookingPayload(booking)
      }
    });

  } catch (error) {
    console.error('❌ Create VNPay URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo URL thanh toán VNPay',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Xử lý return từ VNPay
const handleVNPayReturn = async (req, res) => {
  try {
    console.log('🔄 Processing VNPay return:', req.query);

    // Xử lý kết quả từ VNPay
    const result = vnpayService.processReturn(req.query);
    
    if (!result.success) {
      console.log('❌ VNPay return failed:', result);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?code=${result.code}&message=${encodeURIComponent(result.message)}`);
    }

    const { orderId, transactionNo, amount } = result.data;

    // Tìm VNPay transaction
    const vnpayTransaction = await VNPayTransaction.findOne({
      where: { orderId },
      include: [
        {
          model: Payment,
          as: 'payment',
          include: [
            {
              model: Booking,
              as: 'booking',
              include: buildBookingsQueryInclude({ includePayments: false })
            }
          ]
        }
      ]
    });

    if (!vnpayTransaction) {
      console.log('❌ VNPay transaction not found:', orderId);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?code=NOT_FOUND&message=${encodeURIComponent('Không tìm thấy giao dịch')}`);
    }

    // Cập nhật VNPay transaction
    await vnpayTransaction.update({
      status: 'SUCCESS',
      transactionNo,
      responseCode: result.code,
      responseMessage: result.message,
      paidAt: new Date()
    });

    // Cập nhật payment
    await vnpayTransaction.payment.update({
      paymentStatus: 'SUCCESS',
      transactionId: transactionNo,
      paidAt: new Date()
    });

    // Cập nhật booking
    await vnpayTransaction.payment.booking.update({
      paymentStatus: 'PAID'
    });

    await ensureInvoiceForPayment(vnpayTransaction.payment, vnpayTransaction.payment.booking);

    await recordPaymentLog({
      paymentId: vnpayTransaction.payment.id,
      eventType: 'VNPAY_RETURN',
      status: 'SUCCESS',
      payload: { orderId, transactionNo, amount },
      response: result
    });

    console.log('✅ VNPay payment processed successfully:', {
      orderId,
      transactionNo,
      bookingCode: vnpayTransaction.payment.booking.bookingCode
    });

    // Redirect tới success page với thông tin
    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`;
    const params = new URLSearchParams({
      bookingId: vnpayTransaction.payment.booking.id,
      paymentId: vnpayTransaction.payment.id,
      transactionNo,
      method: 'vnpay'
    });

  res.redirect(`${successUrl}?${params.toString()}`);

  } catch (error) {
    console.error('❌ Handle VNPay return error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?code=SERVER_ERROR&message=${encodeURIComponent('Lỗi server')}`);
  }
};

// ✅ Xử lý IPN từ VNPay
const handleVNPayIPN = async (req, res) => {
  try {
    console.log('🔔 VNPay IPN received:', req.query);

    // Xử lý kết quả từ VNPay
    const result = vnpayService.processReturn(req.query);
    
    if (!result.success) {
      console.log('❌ VNPay IPN verification failed:', result);
      return res.json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const { orderId, transactionNo, amount } = result.data;

    // Tìm VNPay transaction
    const vnpayTransaction = await VNPayTransaction.findOne({
      where: { orderId },
      include: [
        {
          model: Payment,
          as: 'payment',
          include: [
            {
              model: Booking,
              as: 'booking',
              include: buildBookingsQueryInclude({ includePayments: false })
            }
          ]
        }
      ]
    });

    if (!vnpayTransaction) {
      console.log('❌ VNPay transaction not found for IPN:', orderId);
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }

    // Kiểm tra số tiền
    if (vnpayTransaction.amount !== amount) {
      console.log('❌ Amount mismatch:', { expected: vnpayTransaction.amount, received: amount });
      return res.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // Kiểm tra trạng thái giao dịch
    if (vnpayTransaction.status === 'SUCCESS') {
      console.log('ℹ️ Transaction already processed:', orderId);
      return res.json({ RspCode: '00', Message: 'Success' });
    }

    // Cập nhật VNPay transaction
    await vnpayTransaction.update({
      status: 'SUCCESS',
      transactionNo,
      responseCode: result.code,
      responseMessage: result.message,
      paidAt: new Date()
    });

    // Cập nhật payment
    await vnpayTransaction.payment.update({
      paymentStatus: 'SUCCESS',
      transactionId: transactionNo,
      paidAt: new Date()
    });

    // Cập nhật booking
    await vnpayTransaction.payment.booking.update({
      paymentStatus: 'PAID'
    });

    await ensureInvoiceForPayment(vnpayTransaction.payment, vnpayTransaction.payment.booking);

    await recordPaymentLog({
      paymentId: vnpayTransaction.payment.id,
      eventType: 'VNPAY_IPN',
      status: 'SUCCESS',
      payload: { orderId, transactionNo, amount },
      response: result
    });

    console.log('✅ VNPay IPN processed successfully:', {
      orderId,
      transactionNo,
      bookingCode: vnpayTransaction.payment.booking.bookingCode
    });

    // Trả về success cho VNPay
    res.json({ RspCode: '00', Message: 'Success' });

  } catch (error) {
    console.error('❌ Handle VNPay IPN error:', error);
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
};

// ✅ Tra cứu trạng thái giao dịch VNPay
const queryVNPayTransaction = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('🔍 Querying VNPay transaction:', orderId);

    // Tìm VNPay transaction
    const vnpayTransaction = await VNPayTransaction.findOne({
      where: { orderId },
      include: [
        {
          model: Payment,
          as: 'payment',
          include: [
            {
              model: Booking,
              as: 'booking',
              where: { userId: req.user.id }, // Ensure user owns this booking
              include: buildBookingsQueryInclude({ includePayments: false })
            }
          ]
        }
      ]
    });

    if (!vnpayTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch VNPay'
      });
    }

    // Truy vấn VNPay để lấy trạng thái mới nhất
    const transDate = moment(vnpayTransaction.createdAt).format('YYYYMMDD');
    const queryResult = await vnpayService.queryTransaction({
      orderId,
      transDate
    });

    if (queryResult.success) {
      // Cập nhật trạng thái nếu có thay đổi
      const vnpayData = queryResult.data;
      if (vnpayData.vnp_TransactionStatus === '00' && vnpayTransaction.status !== 'SUCCESS') {
        await vnpayTransaction.update({
          status: 'SUCCESS',
          transactionNo: vnpayData.vnp_TransactionNo,
          responseCode: vnpayData.vnp_ResponseCode,
          responseMessage: vnpayService.getResponseMessage(vnpayData.vnp_ResponseCode),
          paidAt: new Date()
        });

        // Cập nhật payment và booking
  await vnpayTransaction.payment.update({ paymentStatus: 'SUCCESS' });
        await vnpayTransaction.payment.booking.update({ paymentStatus: 'PAID' });
      }
    }

    console.log('✅ VNPay transaction queried:', { orderId, status: vnpayTransaction.status });

    const plainTxn = vnpayTransaction.toJSON();
    const payment = plainTxn.payment || null;
    const bookingPayload = payment?.booking
      ? serializeBookingPayload({
          ...payment.booking,
          payments: payment ? [payment] : []
        })
      : null;

    res.json({
      success: true,
      data: {
        orderId: plainTxn.orderId,
        amount: Number(plainTxn.amount),
        status: plainTxn.status,
        transactionNo: plainTxn.transactionNo,
        responseCode: plainTxn.responseCode,
        responseMessage: plainTxn.responseMessage,
        paidAt: plainTxn.paidAt,
        booking: bookingPayload,
        vnpayQuery: queryResult
      }
    });

  } catch (error) {
    console.error('❌ Query VNPay transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tra cứu giao dịch VNPay',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Lấy danh sách ngân hàng hỗ trợ
const getSupportedBanks = async (req, res) => {
  try {
    const banks = vnpayService.getSupportedBanks();
    
    res.json({
      success: true,
      data: banks
    });
  } catch (error) {
    console.error('❌ Get supported banks error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách ngân hàng'
    });
  }
};

// ✅ Lấy lịch sử giao dịch VNPay của user
const getVNPayTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    console.log('🔄 Getting VNPay transactions for user:', req.user.id);

    const { count, rows: transactions } = await VNPayTransaction.findAndCountAll({
      include: [
        {
          model: Payment,
          as: 'payment',
          include: [
            {
              model: Booking,
              as: 'booking',
              where: { userId: req.user.id },
              include: buildBookingsQueryInclude({ includePayments: false })
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`✅ Found ${count} VNPay transactions for user ${req.user.id}`);

    const shapedTransactions = transactions.map((txn) => {
      const plainTxn = txn.toJSON();
      const payment = plainTxn.payment || null;
      const bookingPayload = payment?.booking
        ? serializeBookingPayload({
            ...payment.booking,
            payments: payment ? [payment] : []
          })
        : null;

      return {
        id: plainTxn.id,
        orderId: plainTxn.orderId,
        amount: Number(plainTxn.amount),
        status: plainTxn.status,
        transactionNo: plainTxn.transactionNo,
        responseCode: plainTxn.responseCode,
        responseMessage: plainTxn.responseMessage,
        payment: payment
          ? {
              id: payment.id,
              paymentCode: payment.paymentCode,
              paymentMethod: payment.paymentMethod,
              paymentStatus: payment.paymentStatus,
              paidAt: payment.paidAt
            }
          : null,
        booking: bookingPayload,
        createdAt: plainTxn.createdAt,
        updatedAt: plainTxn.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        transactions: shapedTransactions,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get VNPay transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch sử giao dịch VNPay',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createVNPayUrl,
  handleVNPayReturn,
  handleVNPayIPN,
  queryVNPayTransaction,
  getSupportedBanks,
  getVNPayTransactions,
  getInvoice
};

// ✅ Trả về hóa đơn/biên nhận thanh toán
async function getInvoice(req, res) {
  try {
    const { paymentId } = req.params;

    // Lấy payment kèm booking, user, trip, locations
      const payment = await Payment.findOne({
        where: { id: paymentId },
        include: [
          {
            model: Booking,
            as: 'booking',
            include: buildBookingsQueryInclude({ includePayments: false })
          }
        ]
      });

    if (!payment || !payment.booking || payment.booking.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thanh toán' });
    }

    // Lấy giao dịch VNPay gần nhất
    const lastVNPay = await VNPayTransaction.findOne({
      where: { paymentId: payment.id },
      order: [['createdAt', 'DESC']]
    });

      const paymentPlain = payment.toJSON();
      const bookingPlain = paymentPlain.booking;
      const bookingPayload = bookingPlain
        ? serializeBookingPayload({
            ...bookingPlain,
            payments: [paymentPlain]
          })
        : null;

      const trip = bookingPayload?.trip;
      const customer = bookingPayload?.user;

      const seatCount = Array.isArray(bookingPlain?.seatNumbers) ? bookingPlain.seatNumbers.length : 1;
      const unitPrice = seatCount > 0 ? Number(bookingPlain?.totalPrice ?? 0) / seatCount : 0;

      const receiptNo = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${payment.paymentCode}`;

      const invoice = {
        receiptNo,
      issuedAt: payment.paidAt || new Date(),
      method: payment.paymentMethod,
      status: payment.paymentStatus,
      transactionId: payment.transactionId,
      amount: Number(payment.amount),
      items: Array.isArray(bookingPlain?.seatNumbers)
        ? bookingPlain.seatNumbers.map((s) => ({
            name: `Ghế ${s}`,
            qty: 1,
            price: unitPrice
          }))
        : undefined,
      seats: bookingPayload?.items?.length
        ? bookingPayload.items.map((item) => ({
            id: item.id,
            seatId: item.seatId,
            seatNumber: item.seat?.seatNumber,
            seatType: item.seat?.seatType,
            price: Number(item.price)
          }))
        : undefined,
      booking: bookingPayload
        ? {
            id: bookingPayload.id,
            code: bookingPayload.bookingCode,
            seats: bookingPayload.seatNumbers,
            totalPrice: Number(bookingPayload.totalPrice),
            paymentStatus: bookingPayload.paymentStatus
          }
        : undefined,
      trip: trip
        ? {
            id: trip.id,
            route: trip.route,
            routeMeta: trip.routeMeta,
            departureTime: trip.departureTime,
            arrivalTime: trip.arrivalTime,
            from: trip.departureLocation,
            to: trip.arrivalLocation,
            bus: trip.bus
          }
        : undefined,
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone
          }
        : undefined,
      vnpay: lastVNPay ? {
        orderId: lastVNPay.orderId,
        transactionNo: lastVNPay.transactionNo,
        responseCode: lastVNPay.responseCode,
        responseMessage: lastVNPay.responseMessage,
        status: lastVNPay.status,
        paidAt: lastVNPay.paidAt
      } : undefined
    };

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('❌ Get invoice error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy hóa đơn' });
  }
}





