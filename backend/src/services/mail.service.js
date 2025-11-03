const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const sendBookingConfirmation = async (booking, recipient = {}) => {
  try {
    if (!booking) {
      return;
    }

    const primaryContact =
      recipient?.email ||
      recipient?.to ||
      booking.passengerEmail ||
      booking?.user?.email;

    if (!primaryContact) {
      logger.warn('Skipping booking confirmation email: no recipient provided');
      return;
    }

    const passengerName = recipient?.name || booking.passengerName || 'Quy khach';
    const normalizedDiscount =
      typeof recipient?.discountAmount === 'number'
        ? recipient.discountAmount
        : Number(booking.discountAmount) || 0;
    const voucherCode = recipient?.voucher?.code || booking?.voucher?.code || null;
    const seatList = Array.isArray(booking.seatNumbers) ? booking.seatNumbers.join(', ') : 'N/A';
    const totalPrice = Number(booking.totalPrice) || 0;
    const payable = Math.max(0, totalPrice - normalizedDiscount);

    const subject = `Xac nhan dat ve ${booking.bookingCode}`;
    const textLines = [
      `Xin chao ${passengerName},`,
      `Don dat ve ${booking.bookingCode} da duoc xac nhan.`,
      `Tuyen: ${booking.trip?.route || 'Dang cap nhat'}`,
      `Ghe: ${seatList}`,
      `Tong tien: ${totalPrice.toLocaleString('vi-VN')} VND`
    ];

    if (normalizedDiscount > 0) {
      textLines.push(`Giam gia: -${normalizedDiscount.toLocaleString('vi-VN')} VND`);
      textLines.push(`So tien can thanh toan: ${payable.toLocaleString('vi-VN')} VND`);
    }

    if (voucherCode) {
      textLines.push(`Ma uu dai: ${voucherCode}`);
    }

    textLines.push('Cam on ban da tin tuong su dung dich vu cua chung toi.');

    await sendEmail({
      to: primaryContact,
      subject,
      text: textLines.join('\n'),
      html: `<p>${textLines.join('</p><p>')}</p>`
    });
  } catch (error) {
    logger.warn('Failed to send booking confirmation', error);
  }
};

module.exports = {
  sendBookingConfirmation,
};
