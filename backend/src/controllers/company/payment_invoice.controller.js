const { Payment, Booking, Trip, User } = require('../../../models');
const { ROLES } = require('../../constants/roles');

// Build a simple invoice/receipt payload for a payment
async function getInvoice(req, res) {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      where: { id: paymentId },
      include: [
        {
          model: Booking,
          as: 'booking',
          include: [
            { model: Trip, as: 'trip' },
            { model: User, as: 'user' }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thanh toán' });
    }

    // Authorization: ensure current user owns the booking
    if (
      req.user &&
      payment.booking &&
      payment.booking.userId !== req.user.id &&
      req.user.role !== ROLES.ADMIN
    ) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem hóa đơn này' });
    }

    const booking = payment.booking;
    const trip = booking?.trip;

    const invoice = {
      invoiceNo: payment.paymentCode,
      issuedAt: payment.paidAt || payment.updatedAt,
      method: payment.paymentMethod,
      status: payment.paymentStatus,
      amount: Number(payment.amount),
      currency: 'VND',
      transactionId: payment.transactionId,
      booking: booking
        ? {
            id: booking.id,
            code: booking.bookingCode,
            passengerName: booking.passengerName,
            passengerPhone: booking.passengerPhone,
            passengerEmail: booking.passengerEmail,
            seatNumbers: booking.seatNumbers,
            totalPrice: Number(booking.totalPrice),
            paymentStatus: booking.paymentStatus,
            notes: booking.notes
          }
        : null,
      trip: trip
        ? {
            id: trip.id,
            from: trip.fromLocation,
            to: trip.toLocation,
            departureTime: trip.departureTime,
            arrivalTime: trip.arrivalTime,
            busNumber: trip.busNumber
          }
        : null
    };

    return res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('❌ Get invoice error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy hóa đơn' });
  }
}

module.exports = { getInvoice };
