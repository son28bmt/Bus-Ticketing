const { Payment, Booking, Trip, VNPayTransaction, User, Location } = require('../../models');
const VNPayService = require('../services/vnpay.service');
const moment = require('moment');

const vnpayService = new VNPayService();

// ✅ Tạo URL thanh toán VNPay
const createVNPayUrl = async (req, res) => {
  try {
    const { bookingId, bankCode } = req.body;

    console.log('🔄 Creating VNPay URL for booking:', bookingId);

    // Tìm booking
    const booking = await Booking.findOne({
      where: { id: bookingId, userId: req.user.id },
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

    if (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Vé đã được thanh toán'
      });
    }

    // Tạo hoặc cập nhật payment record
    let payment = await Payment.findOne({ 
      where: { bookingId: booking.id, paymentStatus: 'PENDING' } 
    });
    
    if (!payment) {
      payment = await Payment.create({
        paymentCode: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
        bookingId: booking.id,
        amount: booking.totalPrice,
        paymentMethod: 'VNPAY',
        paymentStatus: 'PENDING'
      });
    }

    // Tạo VNPay transaction record
    const vnpayTransaction = await VNPayTransaction.create({
      paymentId: payment.id,
      orderId: `${booking.bookingCode}_${Date.now()}`,
      amount: booking.totalPrice,
      orderInfo: `Thanh toan ve xe ${booking.bookingCode} - ${booking.passengerName}`,
      bankCode,
      status: 'PENDING'
    });

    // Tạo VNPay URL
    const paymentUrl = vnpayService.createPaymentUrl({
      orderId: vnpayTransaction.orderId,
      amount: booking.totalPrice,
      orderDescription: vnpayTransaction.orderInfo,
      ipAddr: req.ip || '127.0.0.1',
      bankCode,
      locale: 'vn'
    });

    // Cập nhật VNPay transaction với URL
    await vnpayTransaction.update({
      paymentUrl
    });

    console.log('✅ VNPay URL created successfully:', vnpayTransaction.orderId);

    res.json({
      success: true,
      message: 'Tạo URL thanh toán VNPay thành công',
      data: {
        paymentUrl,
        orderId: vnpayTransaction.orderId,
        amount: booking.totalPrice,
        paymentId: payment.id,
        vnpayTransactionId: vnpayTransaction.id
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
              include: [
                {
                  model: Trip,
                  as: 'trip'
                }
              ]
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
              as: 'booking'
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
              where: { userId: req.user.id } // Ensure user owns this booking
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

    res.json({
      success: true,
      data: {
        orderId: vnpayTransaction.orderId,
        amount: vnpayTransaction.amount,
        status: vnpayTransaction.status,
        transactionNo: vnpayTransaction.transactionNo,
        responseCode: vnpayTransaction.responseCode,
        responseMessage: vnpayTransaction.responseMessage,
        paidAt: vnpayTransaction.paidAt,
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
              include: [
                {
                  model: Trip,
                  as: 'trip'
                }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`✅ Found ${count} VNPay transactions for user ${req.user.id}`);

    res.json({
      success: true,
      data: {
        transactions,
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
          include: [
            { model: Trip, as: 'trip', include: [
              { model: Location, as: 'departureLocation' },
              { model: Location, as: 'arrivalLocation' }
            ] },
            { model: User, as: 'user' }
          ]
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

    const booking = payment.booking;
    const trip = booking.trip;
    const customer = booking.user;

    const seatCount = Array.isArray(booking.seatNumbers) ? booking.seatNumbers.length : 1;
    const unitPrice = Number(booking.totalPrice) / seatCount;

    const receiptNo = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${payment.paymentCode}`;

    const invoice = {
      receiptNo,
      issuedAt: payment.paidAt || new Date(),
      method: payment.paymentMethod,
      status: payment.paymentStatus,
      transactionId: payment.transactionId,
      amount: Number(payment.amount),
      items: (Array.isArray(booking.seatNumbers) ? booking.seatNumbers : ["ALL"]).map(s => ({
        name: `Ghế ${s}`,
        qty: 1,
        price: unitPrice
      })),
      booking: {
        id: booking.id,
        code: booking.bookingCode,
        seats: booking.seatNumbers,
        totalPrice: Number(booking.totalPrice),
        paymentStatus: booking.paymentStatus
      },
      trip: trip ? {
        id: trip.id,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        from: trip.departureLocation ? trip.departureLocation.name : undefined,
        to: trip.arrivalLocation ? trip.arrivalLocation.name : undefined
      } : undefined,
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      } : undefined,
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