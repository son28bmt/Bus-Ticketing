// src/pages/MyTickets.tsx
import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../services/booking';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertCircle, Bus, Calendar, Ticket } from 'lucide-react';
import type { UserBooking, ApiError, PaymentProcessData } from '../../types/payment';
import { toViStatus, statusVariant } from '../../utils/status';

// Reusable TicketItem (từ trước, đã đẹp)
const TicketItem = ({
  booking,
  onCancel,
  onPay
}: {
  booking: UserBooking;
  onCancel?: (id: number) => void;
  onPay?: (booking: UserBooking) => void;
}) => {
  const formatTime = (date: string) => format(new Date(date), 'HH:mm');
  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy');

  const iconFor = (status: string): ReactNode => {
    const key = String(status).toUpperCase();
    switch (key) {
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'PAID':
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'CANCELLED':
      case 'FAILED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const bookingStatusText = toViStatus(booking.bookingStatus);
  const bookingStatusVariant = statusVariant(booking.bookingStatus);
  const paymentStatusText = toViStatus(booking.paymentStatus);
  const paymentStatusVariant = statusVariant(booking.paymentStatus);

  return (
    <div className="card h-100 shadow-sm border-0 ticket-card">
      <div className="card-body p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="mb-1 fw-bold text-primary d-flex align-items-center gap-2">
              <Ticket className="w-5 h-5" />
              {booking.bookingCode}
            </h5>
            <small className="text-muted d-flex align-items-center gap-1">
              <Calendar className="w-4 h-4" />
              Đặt: {formatDate(booking.createdAt)} lúc {formatTime(booking.createdAt)}
            </small>
          </div>
          <div className="text-end">
            <span className={`badge bg-${bookingStatusVariant} fs-6 px-3 py-2 mb-1 d-block`}>
              {iconFor(booking.bookingStatus)} {bookingStatusText}
            </span>
            {booking.paymentStatus !== booking.bookingStatus && (
              <span className={`badge bg-${paymentStatusVariant} fs-6 px-3 py-2 d-block`}>
                {iconFor(booking.paymentStatus)} {paymentStatusText}
              </span>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="row align-items-center mb-3">
          <div className="col">
            <div className="d-flex align-items-center gap-3">
              <div className="text-success">
                <div className="fw-bold">{booking.trip.departureLocation}</div>
                <small>{formatTime(booking.trip.departureTime)}</small>
              </div>
              <div className="flex-fill text-center position-relative">
                <Bus className="text-primary" style={{ fontSize: '1.5rem' }} />
                <div className="border-top border-2 border-dashed border-primary position-absolute top-50 start-0 end-0"></div>
              </div>
              <div className="text-danger text-end">
                <div className="fw-bold">{booking.trip.arrivalLocation}</div>
                <small>{formatTime(booking.trip.arrivalTime)}</small>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="row text-center g-3 small">
          <div className="col border-end">
            <div className="text-muted">Hành khách</div>
            <strong>{booking.passengerName}</strong>
          </div>
          <div className="col border-end">
            <div className="text-muted">Số ghế</div>
            <div className="d-flex justify-content-center gap-1 flex-wrap">
              {booking.seatNumbers.map((seat, i) => (
                <span key={i} className="badge bg-light text-dark border">{seat}</span>
              ))}
            </div>
          </div>
          <div className="col">
            <div className="text-muted">Tổng tiền</div>
            <strong className="text-danger fs-5">
              {booking.totalPrice.toLocaleString('vi-VN')} ₫
            </strong>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card-footer bg-transparent border-0 pt-0">
        <div className="d-flex gap-2 justify-content-end">
          <button className="btn btn-outline-primary btn-sm">
            Chi tiết
          </button>
          {booking.bookingStatus === 'CONFIRMED' && (
            <button className="btn btn-outline-danger btn-sm" onClick={() => onCancel?.(booking.id)}>
              Hủy vé
            </button>
          )}
          {booking.paymentStatus === 'PENDING' && (
            <button className="btn btn-primary btn-sm" onClick={() => onPay?.(booking)}>
              Thanh toán
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function MyTickets() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params: { page: number; limit: number; status?: string } = { page: pagination.page, limit: pagination.limit };
      if (filter && filter !== 'ALL') params.status = filter;

      const response = await bookingAPI.getUserBookings(params);
      if (response.success) {
        setBookings(response.data.bookings);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Lỗi tải vé');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Hủy vé này?')) return;
    try {
      await bookingAPI.cancelBooking(bookingId);
      alert('Hủy thành công');
      loadBookings();
    } catch {
      alert('Lỗi hủy vé');
    }
  };

  const handlePayBooking = async (booking: UserBooking) => {
    const pendingPayment = booking.payments?.find((payment) => payment.paymentStatus === 'PENDING');
    if (!pendingPayment) {
      alert('Ve nay khong co giao dich cho thanh toan.');
      return;
    }

    const normalizedMethod = (booking.paymentMethod?.toUpperCase() as PaymentProcessData['paymentMethod']) ?? 'BANK_TRANSFER';

    try {
      await bookingAPI.processPayment(pendingPayment.id, {
        transactionId: 'MANUAL-' + Date.now(),
        amount: booking.totalPrice,
        paymentMethod: normalizedMethod
      });
      alert('Thanh toan thanh cong.');
      loadBookings();
    } catch (err) {
      console.error('Thanh toan loi:', err);
      alert('Thanh toan khong thanh cong, vui long thu lai.');
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="display-5 fw-bold text-primary mb-2">Vé của tôi</h1>
          <p className="text-muted">Quản lý và theo dõi tất cả vé đã đặt</p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="d-flex justify-content-center gap-2 mb-4 flex-wrap">
          {['', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((key) => {
            const labels: Record<string, string> = { '': 'Tất cả', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' };
            return (
              <button
                key={key}
                className={`btn ${filter === key ? 'btn-primary' : 'btn-outline-primary'} px-4`}
                onClick={() => { setFilter(key); setPagination(prev => ({ ...prev, page: 1 })); }}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Đang tải vé...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-5">
            <div className="mb-4">
              <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '100px', height: '100px' }}>
                <Ticket className="w-12 h-12 text-muted" />
              </div>
            </div>
            <h3>Chưa có vé nào</h3>
            <p className="text-muted mb-4">Hãy tìm chuyến xe phù hợp và đặt vé ngay!</p>
            <Link to="/search" className="btn btn-primary btn-lg">
              Tìm chuyến xe
            </Link>
          </div>
        ) : (
          <>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="col">
                  <TicketItem booking={booking} onCancel={handleCancelBooking} onPay={handlePayBooking} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <nav className="d-flex justify-content-center mt-5">
                <ul className="pagination">
                  <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Trước
                    </button>
                  </li>
                  <li className="page-item disabled">
                    <span className="page-link">
                      {pagination.page} / {pagination.pages}
                    </span>
                  </li>
                  <li className={`page-item ${pagination.page >= pagination.pages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Sau
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
