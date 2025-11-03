import type { UserBooking } from '../../types/payment';
import { formatPrice } from '../../utils/price';
import { formatDate, formatTime } from '../../utils/formatDate';
import '../../style/booking-detail.css';

interface BookingDetailModalProps {
  open: boolean;
  booking: UserBooking | null;
  loading?: boolean;
  onClose: () => void;
  context?: 'admin' | 'company';
}

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'COMPLETED':
      return 'Hoàn tất';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'PAID':
      return 'Đã thanh toán';
    case 'PENDING':
      return 'Chờ thanh toán';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    default:
      return status || '—';
  }
};

export default function BookingDetailModal({
  open,
  booking,
  loading = false,
  onClose,
  context = 'company'
}: BookingDetailModalProps) {
  if (!open) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const grossTotal = booking ? Number(booking.totalPrice ?? 0) : 0;
  const discount = booking ? Number(booking.discountAmount ?? 0) : 0;
  const payable = booking
    ? Number(
        booking.payableAmount != null
          ? booking.payableAmount
          : Math.max(0, grossTotal - discount)
      )
    : 0;

  return (
    <div className="booking-detail-backdrop" onMouseDown={handleBackdropClick}>
      <div className="booking-detail-dialog" role="dialog" aria-modal="true">
        <button
          type="button"
          className="booking-detail-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>

        {loading || !booking ? (
          <div className="booking-detail-spinner">
            <div className="spinner" />
            <p>Đang tải chi tiết vé…</p>
          </div>
        ) : (
          <div className="booking-detail-content">
            <header className="booking-detail-header">
              <div>
                <h2>
                  Vé {booking.bookingCode}
                </h2>
                <p className="muted">
                  Tạo lúc {formatDate(booking.createdAt)} • {formatTime(booking.createdAt)}
                </p>
              </div>
              <div className="booking-detail-status-group">
                <span className="badge bg-primary">
                  {getStatusLabel(booking.bookingStatus)}
                </span>
                <span className="badge bg-success">
                  {getStatusLabel(booking.paymentStatus)}
                </span>
              </div>
            </header>

            <section className="booking-detail-section">
              <h3>Thông tin hành khách</h3>
              <div className="booking-detail-grid">
                <div>
                  <p className="detail-label">Họ tên</p>
                  <p className="detail-value">{booking.passengerName}</p>
                </div>
                <div>
                  <p className="detail-label">Số điện thoại</p>
                  <p className="detail-value">{booking.passengerPhone}</p>
                </div>
                <div>
                  <p className="detail-label">Email</p>
                  <p className="detail-value">{booking.passengerEmail || '—'}</p>
                </div>
                <div>
                  <p className="detail-label">Ghi chú</p>
                  <p className="detail-value">{booking.notes || 'Không có'}</p>
                </div>
              </div>
            </section>

            <section className="booking-detail-section">
              <h3>Thông tin chuyến đi</h3>
              <div className="booking-detail-grid">
                <div>
                  <p className="detail-label">Tuyến</p>
                  <p className="detail-value">
                    {booking.trip.departureLocation} → {booking.trip.arrivalLocation}
                  </p>
                </div>
                <div>
                  <p className="detail-label">Thời gian khởi hành</p>
                  <p className="detail-value">
                    {formatDate(booking.trip.departureTime)} • {formatTime(booking.trip.departureTime)}
                  </p>
                </div>
                <div>
                  <p className="detail-label">Thời gian đến</p>
                  <p className="detail-value">
                    {formatDate(booking.trip.arrivalTime)} • {formatTime(booking.trip.arrivalTime)}
                  </p>
                </div>
                <div>
                  <p className="detail-label">Số ghế</p>
                  <p className="detail-value">
                    {Array.isArray(booking.seatNumbers) ? booking.seatNumbers.join(', ') : '—'}
                  </p>
                </div>
                <div>
                  <p className="detail-label">Xe</p>
                  <p className="detail-value">
                    {booking.trip.bus.busNumber} ({booking.trip.bus.busType})
                  </p>
                </div>
                {context === 'admin' && booking.trip.bus.company && (
                  <div>
                    <p className="detail-label">Nhà xe</p>
                    <p className="detail-value">
                      {booking.trip.bus.company.name} ({booking.trip.bus.company.code})
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="booking-detail-section">
              <h3>Thanh toán</h3>
              <div className="booking-detail-grid">
                <div>
                  <p className="detail-label">Phương thức</p>
                  <p className="detail-value">{booking.paymentMethod}</p>
                </div>
                <div>
                  <p className="detail-label">Tổng tiền</p>
                  <p className="detail-value">{formatPrice(grossTotal)}</p>
                </div>
                <div>
                  <p className="detail-label">Giảm giá</p>
                  <p className="detail-value">{formatPrice(discount)}</p>
                </div>
                <div>
                  <p className="detail-label">Khách cần thanh toán</p>
                  <p className="detail-value text-success">{formatPrice(payable)}</p>
                </div>
                <div>
                  <p className="detail-label">Voucher</p>
                  <p className="detail-value">
                    {booking.voucher?.code || booking.voucherId ? booking.voucher?.code ?? `ID ${booking.voucherId}` : 'Không áp dụng'}
                  </p>
                </div>
              </div>

              <div className="booking-detail-payments">
                <p className="detail-label">Lịch sử thanh toán</p>
                {booking.payments && booking.payments.length > 0 ? (
                  <ul className="detail-payment-list">
                    {booking.payments.map((payment) => (
                      <li key={payment.id} className="detail-payment-item">
                        <div>
                          <strong>{payment.paymentCode}</strong>
                          <span className="badge bg-secondary ms-2">
                            {getStatusLabel(payment.paymentStatus)}
                          </span>
                        </div>
                        <div className="detail-payment-meta">
                          <span>{payment.paymentMethod}</span>
                          <span>{formatPrice(payment.amount)}</span>
                          {payment.paidAt && (
                            <span>
                              {formatDate(payment.paidAt)} • {formatTime(payment.paidAt)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="detail-value">Chưa có giao dịch thanh toán.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
