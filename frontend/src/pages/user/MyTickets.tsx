// src/pages/MyTickets.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../services/booking';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertCircle, Bus, Calendar, Ticket } from 'lucide-react';
import type { UserBooking, ApiError, PaymentProcessData } from '../../types/payment';
import { toViStatus, statusVariant } from '../../utils/status';

const CANCEL_REASONS = [
  'Tôi đổi kế hoạch di chuyển',
  'Đặt nhầm ngày giờ',
  'Đặt nhầm thông tin hành khách',
  'Thay đổi phương tiện',
  'Giá chưa phù hợp',
  'Lý do khác'
];

// Reusable TicketItem (từ trước, đã đẹp)
const TicketItem = ({
  booking,
  onCancel,
  onPay,
  onViewDetails,
  cancelling,
  detailLoading
}: {
  booking: UserBooking;
  onCancel?: (booking: UserBooking) => void;
  onPay?: (booking: UserBooking) => void;
  onViewDetails?: (booking: UserBooking) => void;
  cancelling?: boolean;
  detailLoading?: boolean;
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
          <button className="btn btn-outline-primary btn-sm" onClick={() => onViewDetails?.(booking)} disabled={detailLoading}>
            {detailLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Đang tải...
              </>
            ) : (
              'Chi tiết'
            )}
          </button>
          {booking.bookingStatus === 'CONFIRMED' && (
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => onCancel?.(booking)}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Đang xác nhận...
                </>
              ) : (
                'Hủy vé'
              )}
            </button>
          )}
          {booking.paymentStatus === 'PENDING' && (
            <button className="btn btn-primary btn-sm" onClick={() => onPay?.(booking)}>
              Thanh toán
            </button>
          )}
          {booking.bookingStatus === 'CANCEL_REQUESTED' && (
            <small className="text-warning text-end w-100">
              Đã gửi yêu cầu hủy{booking.cancelReason ? `: ${booking.cancelReason}` : ''}.
            </small>
          )}
          {booking.bookingStatus === 'CANCEL_REQUESTED' && (
            <small className="text-warning text-end w-100">
              Đã gửi yêu cầu hủy, đang chờ nhà xe xác nhận.
            </small>
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [detailModalBooking, setDetailModalBooking] = useState<UserBooking | null>(null);
  const detailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<UserBooking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelAgree, setCancelAgree] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  });
  const selectedTripCompanyName =
    detailModalBooking?.trip?.company?.name ||
    detailModalBooking?.trip?.bus?.company?.name ||
    'Nhà xe đang cập nhật';

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

  useEffect(() => {
    return () => {
      if (detailTimeoutRef.current) {
        clearTimeout(detailTimeoutRef.current);
      }
    };
  }, []);

  const handleViewDetails = (booking: UserBooking) => {
    if (detailTimeoutRef.current) {
      clearTimeout(detailTimeoutRef.current);
    }
    setDetailModalVisible(true);
    setDetailModalLoading(true);
    setDetailModalBooking(null);
    setDetailLoadingId(booking.id);
    detailTimeoutRef.current = setTimeout(() => {
      setDetailModalLoading(false);
      setDetailModalBooking(booking);
      setDetailLoadingId(null);
    }, 500);
  };

  const closeDetailModal = () => {
    if (detailTimeoutRef.current) {
      clearTimeout(detailTimeoutRef.current);
    }
    setDetailModalVisible(false);
    setDetailModalLoading(false);
    setDetailModalBooking(null);
    setDetailLoadingId(null);
  };

  const handlePayBooking = async (booking: UserBooking) => {
    const pendingPayment = booking.payments?.find((payment) => payment.paymentStatus === 'PENDING');
    if (!pendingPayment) {
      alert('Vé này không có giao dịch cho thanh toán.');
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

  const resetCancelState = () => {
    setCancelReason(CANCEL_REASONS[0]);
    setCancelNote('');
    setCancelAgree(false);
    setCancelError('');
  };

  const handleOpenCancelModal = (booking: UserBooking) => {
    setCancelModalBooking(booking);
    setCancelReason(booking.cancelReason || CANCEL_REASONS[0]);
    setCancelNote('');
    setCancelAgree(false);
    setCancelError('');
  };

  const handleCloseCancelModal = () => {
    if (cancelSubmitting) return;
    setCancelModalBooking(null);
    resetCancelState();
  };

  const handleSubmitCancelRequest = async () => {
    if (!cancelModalBooking) {
      setCancelError('Không tìm thấy vé đang chọn hiện tại.');
      return;
    }

    if (!cancelAgree) {
      setCancelError('Vui lòng xác nhận đã đọc và đồng ý chính sách hủy.');
      return;
    }

    setCancelSubmitting(true);
    setCancelError('');

    try {
      const payload = {
        reason: cancelReason,
        note: cancelNote.trim() ? cancelNote.trim() : undefined
      };

      const response = await bookingAPI.requestCancellation(cancelModalBooking.id, payload);
      const updatedBooking = response.booking;
      if (updatedBooking) {
        setBookings((prev) => prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item)));
      } else {
        setBookings((prev) =>
          prev.map((item) =>
            item.id === cancelModalBooking.id
              ? {
                  ...item,
                  bookingStatus: 'CANCEL_REQUESTED',
                  cancelReason: cancelReason
                }
              : item
          )
        );
      }

      setFeedback({
        type: 'success',
        text: response.message || 'đã gửi yêu cầu hủy vé. Nhà xe sẽ sớm phản hồi.'
      });

      setCancelSubmitting(false);
      handleCloseCancelModal();
    } catch (err) {
      const apiError = err as ApiError;
      setCancelError(apiError.response?.data?.message || 'Không thể gửi yêu cầu hủy. Vui lòng thử lại.');
      setCancelSubmitting(false);
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

        {feedback && (
          <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'} mt-3`} role="alert">
            {feedback.text}
          </div>
        )}

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
                  <TicketItem
                    booking={booking}
                    onCancel={handleOpenCancelModal}
                    onPay={handlePayBooking}
                    onViewDetails={handleViewDetails}
                    cancelling={cancelSubmitting && cancelModalBooking?.id === booking.id}
                    detailLoading={detailLoadingId === booking.id}
                  />
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

      {detailModalVisible && (
        <div
          className="ticket-detail-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={closeDetailModal}
        >
          <div
            className="bg-white shadow-lg rounded-4 p-4 w-100"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(event) => event.stopPropagation()}
          >
            {detailModalLoading || !detailModalBooking ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted">đang tải chi tiết vé...</p>
              </div>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h4 className="mb-1">Chi tiết vé</h4>
                    <small className="text-muted">Mã đặt vé: {detailModalBooking.bookingCode}</small>
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeDetailModal}>
                    Đóng
                  </button>
                </div>

                <div className="mb-3">
                  <div className="fw-bold text-primary">
                    {detailModalBooking.trip.departureLocation} &rarr; {detailModalBooking.trip.arrivalLocation}
                  </div>
                  <small className="text-muted d-block">
                    Khởi hành: {format(new Date(detailModalBooking.trip.departureTime), 'HH:mm dd/MM/yyyy')}
                  </small>
                  <small className="text-muted">
                    Nhà xe: <span className="fw-semibold text-dark">{selectedTripCompanyName}</span>
                  </small>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted mb-1">Họ tên</div>
                      <strong>{detailModalBooking.passengerName}</strong>
                      <div className="text-muted mt-2">Điện thoại</div>
                      <strong>{detailModalBooking.passengerPhone}</strong>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted mb-1">Trạng thái</div>
                      <span className={`badge bg-${statusVariant(detailModalBooking.bookingStatus)}`}>
                        {toViStatus(detailModalBooking.bookingStatus)}
                      </span>
                      <div className="text-muted mt-2">Thanh toán</div>
                      <span className={`badge bg-${statusVariant(detailModalBooking.paymentStatus)}`}>
                        {toViStatus(detailModalBooking.paymentStatus)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded p-3 mt-3">
                  <div className="text-muted mb-2">Ghế ngồi</div>
                  <div className="d-flex flex-wrap gap-2">
                    {detailModalBooking.seatNumbers.map((seat, idx) => (
                      <span key={idx} className="badge bg-light text-dark border">
                        {seat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border rounded p-3 mt-3">
                  <div className="d-flex justify-content-between">
                    <span>Tổng tiền</span>
                    <strong>{detailModalBooking.totalPrice.toLocaleString('vi-VN')} ₫</strong>
                  </div>
                  <div className="d-flex justify-content-between text-muted">
                    <span>Giảm giá</span>
                    <span>{detailModalBooking.discountAmount.toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="d-flex justify-content-between mt-2">
                    <span>Thanh toán</span>
                    <span className="fw-bold text-danger">
                      {(detailModalBooking.payableAmount ?? detailModalBooking.totalPrice).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {cancelModalBooking && (
        <div className="booking-detail-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !cancelSubmitting && handleCloseCancelModal()}>
          <div className="booking-detail-dialog" role="dialog" aria-modal="true">
            <button type="button" className="booking-detail-close" onClick={handleCloseCancelModal} aria-label="Đóng" disabled={cancelSubmitting}>
              ×
            </button>

            <h4 className="mb-3">Hủy vé {cancelModalBooking.bookingCode}</h4>
            <p className="text-muted">
              Vui lòng chọn lý do và xác nhận chính sách hủy. Nhà xe sẽ phản hồi trong thời gian sớm nhất.
            </p>

            <div className="mb-3">
              <label className="form-label fw-semibold">Lý do hủy vé</label>
              <select
                className="form-select"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={cancelSubmitting}
              >
                {CANCEL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Ghi chú thêm cho nhà xe</label>
              <textarea
                className="form-control"
                rows={3}
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Ví dụ: Tôi đã đặt nhầm tên hành khách..."
                disabled={cancelSubmitting}
              />
            </div>

            <div className="alert alert-light border mb-3">
              <strong>Chính sách hủy:</strong>
              <ul className="mb-0">
                <li>Trước 24 giờ: hoàn 100%.</li>
                <li>Từ 6 - 24 giờ: hoàn 50%.</li>
                <li>Ít hơn 6 giờ: không hoàn tiền.</li>
              </ul>
            </div>

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="cancel-agree"
                checked={cancelAgree}
                onChange={(e) => setCancelAgree(e.target.checked)}
                disabled={cancelSubmitting}
              />
              <label className="form-check-label" htmlFor="cancel-agree">
                Tôi đồng ý với chính sách hủy vé và hoàn tiền.
              </label>
            </div>

            {cancelError && (
              <div className="alert alert-danger" role="alert">
                {cancelError}
              </div>
            )}

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={handleCloseCancelModal} disabled={cancelSubmitting}>
                Đóng
              </button>
              <button type="button" className="btn btn-danger" onClick={handleSubmitCancelRequest} disabled={cancelSubmitting}>
                {cancelSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}










