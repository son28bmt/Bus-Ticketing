const { sendEmail } = require("../utils/email");
const logger = require("../utils/logger");

const toPlain = (value) =>
  value && typeof value.toJSON === "function" ? value.toJSON() : value || {};

const formatCurrency = (value) => {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(safeValue);
};

const formatDateTime = (value) => {
  if (!value) return "Đang cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
};

const buildTripSummary = (trip) => {
  const routeLabel =
    trip?.route ||
    [trip?.departureLocation, trip?.arrivalLocation]
      .filter(Boolean)
      .join(" → ") ||
    "Đang cập nhật";

  return {
    routeLabel,
    departureTime: formatDateTime(trip?.departureTime),
    arrivalTime: formatDateTime(trip?.arrivalTime),
  };
};

const sendBookingConfirmation = async (booking, recipient = {}) => {
  try {
    if (!booking) {
      return;
    }

    const normalizedBooking = toPlain(booking);
    const primaryContact =
      recipient?.email ||
      recipient?.to ||
      normalizedBooking.passengerEmail ||
      normalizedBooking?.user?.email;

    if (!primaryContact) {
      logger.warn("Skipping booking confirmation email: no recipient provided");
      return;
    }

    const passengerName =
      recipient?.name || normalizedBooking.passengerName || "Quý khách";
    const normalizedDiscount =
      typeof recipient?.discountAmount === "number"
        ? recipient.discountAmount
        : Number(normalizedBooking.discountAmount) || 0;
    const voucherCode =
      recipient?.voucher?.code || normalizedBooking?.voucher?.code || undefined;
    const seatList = Array.isArray(normalizedBooking.seatNumbers)
      ? normalizedBooking.seatNumbers.join(", ")
      : "Đang cập nhật";
    const totalPrice = Number(normalizedBooking.totalPrice) || 0;
    const payable = Math.max(0, totalPrice - normalizedDiscount);

    const tripDetail = buildTripSummary(
      recipient.trip || normalizedBooking.trip
    );

    const subject = `Xác nhận đặt vé ${normalizedBooking.bookingCode}`;
    const textLines = [
      `Xin chào ${passengerName},`,
      `Đơn đặt vé ${normalizedBooking.bookingCode} đã được xác nhận.`,
      `Tuyến: ${tripDetail.routeLabel}`,
      `Khởi hành: ${tripDetail.departureTime}`,
      `Dự kiến đến: ${tripDetail.arrivalTime}`,
      `Ghế: ${seatList}`,
      `Tổng tiền: ${formatCurrency(totalPrice)}`,
    ];

    if (normalizedDiscount > 0) {
      textLines.push(`Giảm giá: -${formatCurrency(normalizedDiscount)}`);
      textLines.push(`Số tiền còn lại: ${formatCurrency(payable)}`);
    }

    if (voucherCode) {
      textLines.push(`Mã ưu đãi đã áp dụng: ${voucherCode}`);
    }

    textLines.push("Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của chúng tôi.");

    const htmlMessage = `
      <div style="max-width:620px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;border-radius:12px;color:#0f172a;">
  
  <!-- HEADER -->
  <div style="text-align:center;padding:20px 0;">
    <img src="src/frontend/public/logo_shanbus.png" alt="ShanBus Logo" style="width:120px;margin-bottom:12px;" />
    <h2 style="color:#1d4ed8;margin:0;font-size:22px;">XÁC NHẬN ĐẶT VÉ THÀNH CÔNG</h2>
    <p style="margin:6px 0 0;font-size:15px;color:#475569;">
      Mã đặt chỗ: <strong style="font-size:18px;color:#1e40af;">${
        normalizedBooking.bookingCode
      }</strong>
    </p>
  </div>

  <!-- BOX -->
  <div style="background:white;padding:20px 24px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
    
    <p style="font-size:15px;">Xin chào <strong>${passengerName}</strong>,</p>
    <p style="font-size:15px;margin-bottom:20px;">
      Cảm ơn bạn đã sử dụng dịch vụ của <strong>ShanBus</strong>.  
      Dưới đây là thông tin chuyến đi của bạn:
    </p>

    <!-- Trip Info -->
    <h3 style="font-size:17px;margin-bottom:12px;color:#1d4ed8;">🚌 Thông tin chuyến đi</h3>

    <table style="width:100%;font-size:15px;border-collapse:collapse;">
      <tbody>
        <tr>
          <td style="padding:8px 0;font-weight:600;width:150px;">Tuyến</td>
          <td>${tripDetail.routeLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:600;">Khởi hành</td>
          <td>${tripDetail.departureTime}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:600;">Dự kiến đến</td>
          <td>${tripDetail.arrivalTime}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:600;">Số ghế</td>
          <td>${seatList}</td>
        </tr>
      </tbody>
    </table>

    <!-- Price -->
    <h3 style="font-size:17px;margin:20px 0 12px;color:#1d4ed8;">💰 Thông tin thanh toán</h3>
    <table style="width:100%;font-size:15px;border-collapse:collapse;">
      <tbody>
        <tr>
          <td style="padding:6px 0;font-weight:600;width:150px;">Tổng tiền</td>
          <td>${formatCurrency(totalPrice)}</td>
        </tr>

        ${
          normalizedDiscount > 0
            ? `
        <tr>
          <td style="padding:6px 0;font-weight:600;">Giảm giá</td>
          <td>- ${formatCurrency(normalizedDiscount)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;">Thanh toán</td>
          <td><strong style="color:#dc2626;">${formatCurrency(
            payable
          )}</strong></td>
        </tr>
        `
            : ""
        }

        ${
          voucherCode
            ? `
        <tr>
          <td style="padding:6px 0;font-weight:600;">Mã ưu đãi</td>
          <td>${voucherCode}</td>
        </tr>
        `
            : ""
        }
      </tbody>
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin-top:24px;">
      <a href="https://shanbus.com/my-tickets"
         style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:16px;display:inline-block;">
         XEM VÉ CỦA BẠN
      </a>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="text-align:center;margin-top:28px;color:#64748b;font-size:13px;">
    <p>Hotline hỗ trợ: <strong style="color:#1d4ed8;">0915 582 684</strong></p>
    <p>Email: support@shanbus.com</p>
    <p>Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của ShanBus.</p>
  </div>

</div>

    `;

    await sendEmail({
      to: primaryContact,
      subject,
      text: textLines.join("\n"),
      html: htmlMessage,
    });
  } catch (error) {
    logger.warn("Failed to send booking confirmation", error);
  }
};

module.exports = {
  sendBookingConfirmation,
  sendCustomEmail: async ({ to, subject, text, html }) => {
    if (!to) return;
    try {
      await sendEmail({ to, subject, text, html });
    } catch (error) {
      logger.warn("Failed to send custom email", error);
    }
  },
};
