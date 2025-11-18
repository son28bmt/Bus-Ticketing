import { useCallback, useEffect, useMemo, useState } from 'react';
import { companyAPI } from '../../services/company';
import type { UserBooking } from '../../types/payment';
import '../../style/table.css';
import { formatPrice } from '../../utils/price';
import { toViStatus, statusVariant } from '../../utils/status';
import BookingDetailModal from '../../components/common/BookingDetailModal';

type FilterState = {
  status: string;
  paymentStatus: string;
  search: string;
};

const initialFilters: FilterState = {
  status: 'ALL',
  paymentStatus: 'ALL',
  search: ''
};

const DEFAULT_LIMIT = 20;

const BOOKING_STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'COMPLETED', label: 'Đã hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'CANCEL_REQUESTED', label: 'Chờ xác nhận hủy' }
];

const PAYMENT_STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'PENDING', label: 'Chờ thanh toán' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
  { value: 'REFUND_PENDING', label: 'Chờ hoàn tiền' }
];

export default function ManageBookings() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedBooking, setSelectedBooking] = useState<UserBooking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approvalBooking, setApprovalBooking] = useState<UserBooking | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalRefund, setApprovalRefund] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesStatus =
        filters.status === 'ALL' || booking.bookingStatus === filters.status;
      const matchesPayment =
        filters.paymentStatus === 'ALL' || booking.paymentStatus === filters.paymentStatus;
      const search = filters.search.trim().toLowerCase();
      const matchesSearch = !search || [
        booking.bookingCode,
        booking.passengerName,
        booking.passengerPhone
      ].some((field) => field?.toLowerCase().includes(search));
      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [bookings, filters]);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyAPI.getBookings();
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tải danh sách đặt vé của nhà xe.');
      }
      const data = Array.isArray(response.data) ? response.data : [];
      setBookings(data.slice(0, DEFAULT_LIMIT));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách đặt vé của nhà xe.';
      setError(message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleViewDetails = (booking: UserBooking) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedBooking(booking);
    window.setTimeout(() => {
      setDetailLoading(false);
    }, 200);
  };

  const handleCloseDetails = () => {
    setDetailOpen(false);
    setSelectedBooking(null);
    setDetailLoading(false);
  };

  const handleOpenApproval = (booking: UserBooking, options?: { refund?: boolean }) => {
    setApprovalBooking(booking);
    setApprovalNote('');
    setApprovalError(null);
    setApprovalRefund(
      options?.refund ??
        (booking.paymentStatus === 'REFUND_PENDING' || booking.paymentStatus === 'PAID')
    );
  };

  const handleCloseApproval = () => {
    setApprovalBooking(null);
    setApprovalNote('');
    setApprovalError(null);
    setApprovalRefund(false);
  };

  const handleSubmitApproval = async () => {
    if (!approvalBooking) return;
    try {
      setApprovalLoading(true);
      setApprovalError(null);
      const response = await companyAPI.approveCancellation(approvalBooking.id, {
        note: approvalNote,
        shouldRefund: approvalRefund
      });
      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'Không thể xử lý yêu cầu hủy.');
      }
      const updatedBooking = response.data;
      setBookings((prev) =>
        prev.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking))
      );
      if (selectedBooking?.id === updatedBooking.id) {
        setSelectedBooking(updatedBooking);
      }
      handleCloseApproval();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể xác nhận hủy vé. Vui lòng thử lại sau.';
      setApprovalError(message);
    } finally {
      setApprovalLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="mb-1">Đặt vé của nhà xe</h1>
          <p className="text-muted mb-0">
            Quản lý các vé do nhà xe của bạn nhận được. Dữ liệu đã được giới hạn theo nhà xe.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleResetFilters}
            disabled={loading}
          >
            Đặt lại
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={loadBookings}
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="card p-3 mb-4">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label">Tìm kiếm</label>
            <input
              className="form-control"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Mã đặt vé, tên hành khách, số điện thoại"
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Trạng thái đặt vé</label>
                        <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              {BOOKING_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Trạng thái thanh toán</label>
                        <select
              className="form-select"
              value={filters.paymentStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }))}
            >
              {PAYMENT_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-3">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Mã đặt vé</th>
                <th>Hành khách</th>
                <th>Chuyến</th>
                <th>Ghế</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Thanh toán</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const grossTotal = Number(booking.totalPrice ?? 0);
                const discount = Number(booking.discountAmount ?? 0);
                const payable = Number(
                  booking.payableAmount != null
                    ? booking.payableAmount
                    : Math.max(0, grossTotal - discount)
                );

                return (
                  <tr key={booking.id}>
                  <td>{booking.bookingCode}</td>
                  <td>
                    <div className="d-flex flex-column">
                      <span className="fw-semibold">{booking.passengerName}</span>
                      <small className="text-muted">{booking.passengerPhone}</small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-column">
                      <span>{booking.trip?.departureLocation} → {booking.trip?.arrivalLocation}</span>
                      <small className="text-muted">
                        {booking.trip?.departureTime
                          ? new Date(booking.trip.departureTime).toLocaleString('vi-VN')
                          : '—'}
                      </small>
                    </div>
                  </td>
                  <td>{Array.isArray(booking.seatNumbers) ? booking.seatNumbers.join(', ') : '-'}</td>
                  <td>
                    <div className="d-flex flex-column">
                      <span className="fw-bold text-success">{formatPrice(payable)}</span>
                      {discount > 0 && (
                        <small className="text-muted">
                          Giảm: -{formatPrice(discount)}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge bg-${statusVariant(booking.bookingStatus)}`}>
                      {toViStatus(booking.bookingStatus)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge bg-${statusVariant(booking.paymentStatus)}`}>
                      {toViStatus(booking.paymentStatus)}
                    </span>
                  </td>
                  <td>{new Date(booking.createdAt).toLocaleString('vi-VN')}</td>
                  <td>
                    <div className="d-flex flex-column gap-2">
                      {booking.bookingStatus === 'CANCEL_REQUESTED' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-warning text-white"
                          onClick={() => handleOpenApproval(booking)}
                        >
                          Xác nhận hủy
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleViewDetails(booking)}
                      >
                        Xem
                      </button>
                    </div>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filteredBookings.length === 0 && (
          <div className="text-center py-4 text-muted">
            Không có đặt vé nào phù hợp.
          </div>
        )}
        {loading && (
          <div className="text-center py-4 text-muted">
            Đang tải dữ liệu...
          </div>
        )}
      </div>

      {approvalBooking && (
        <div className="booking-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !approvalLoading && handleCloseApproval()}>
          <div className="booking-detail-dialog" role="dialog" aria-modal="true">
            <button
              type="button"
              className="booking-detail-close"
              onClick={handleCloseApproval}
              aria-label="Đóng"
              disabled={approvalLoading}
            >
              ×
            </button>

            <h4 className="mb-3">Xác nhận hủy vé {approvalBooking.bookingCode}</h4>
              <p className="text-muted">
                Gửi ghi chú cho hành khách và xác nhận rằng vé đã được hủy. Nếu khách đã thanh toán, hãy chọn hoàn tiền.
              </p>

              <div className="mb-3">
                <label className="form-label fw-semibold">Lý do khách yêu cầu hủy</label>
                <p className="form-control-plaintext">
                  {approvalBooking.cancelReason || 'Không có'}
                </p>
              </div>

              <div className="alert alert-light border mb-3">
                <strong>Chính sách hoàn tiền:</strong>
                <ul className="mb-0">
                  <li>Trước 24 giờ khởi hành: hoàn 100%.</li>
                  <li>Từ 6 - 24 giờ: hoàn 50%.</li>
                  <li>Ít hơn 6 giờ: không hoàn.</li>
                </ul>
              </div>

            <div className="mb-3">
              <label className="form-label">Ghi chú gửi khách</label>
              <textarea
                className="form-control"
                rows={3}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Ví dụ: Đã tiếp nhận yêu cầu và hoàn tiền trong 3 ngày làm việc..."
                disabled={approvalLoading}
              />
            </div>

            {(approvalBooking.paymentStatus === 'PAID' || approvalBooking.paymentStatus === 'REFUND_PENDING') && (
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="approvalRefund"
                  checked={approvalRefund}
                  onChange={(e) => setApprovalRefund(e.target.checked)}
                  disabled={approvalLoading}
                />
                <label className="form-check-label" htmlFor="approvalRefund">
                  Hoàn tiền cho khách
                </label>
              </div>
            )}

            {approvalError && (
              <div className="alert alert-danger" role="alert">
                {approvalError}
              </div>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={handleCloseApproval} disabled={approvalLoading}>
                Hủy
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSubmitApproval} disabled={approvalLoading}>
                {approvalLoading ? 'Đang xác nhận...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BookingDetailModal
        open={detailOpen}
        booking={selectedBooking}
        loading={detailLoading}
        onClose={handleCloseDetails}
        context="company"
        onRequestCancel={handleOpenApproval}
      />
    </div>
  );
}
