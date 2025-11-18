const { Booking, Trip, Bus, Location } = require('../../../models');
const { generateTicketQr } = require('../../utils/qr');

// Return ticket details together with QR encoded payload
const getTicketQr = async (req, res) => {
  try {
    const { bookingCode } = req.params;
    if (!bookingCode) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã đặt vé',
      });
    }

    const booking = await Booking.findOne({
      where: {
        bookingCode,
        userId: req.user.id,
      },
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Bus, as: 'bus', attributes: ['id', 'busNumber', 'busType'] },
            { model: Location, as: 'departureLocation', attributes: ['id', 'name', 'province'] },
            { model: Location, as: 'arrivalLocation', attributes: ['id', 'name', 'province'] },
          ],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé phù hợp',
      });
    }

    const qrPayload = {
      bookingCode: booking.bookingCode,
      tripId: booking.tripId,
      seatNumbers: booking.seatNumbers,
      passengerName: booking.passengerName,
      passengerPhone: booking.passengerPhone,
      issuedAt: new Date().toISOString(),
    };

    const qrData = await generateTicketQr(qrPayload);

    return res.json({
      success: true,
      data: {
        booking,
        qr: qrData,
      },
    });
  } catch (error) {
    console.error('user.getTicketQr error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo mã QR cho vé',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getTicketQr,
};
