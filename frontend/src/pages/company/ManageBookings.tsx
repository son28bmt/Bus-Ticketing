import { useCallback, useEffect, useMemo, useState } from 'react';
import { companyAPI } from '../../services/company';
import type { UserBooking } from '../../types/payment';
import '../../style/table.css';
import { formatPrice } from '../../utils/price';
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

export default function ManageBookings() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedBooking, setSelectedBooking] = useState<UserBooking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

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
              <option value="ALL">Tất cả</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="COMPLETED">Đã hoàn tất</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Trạng thái thanh toán</label>
            <select
              className="form-select"
              value={filters.paymentStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }))}
            >
              <option value="ALL">Tất cả</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
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
                    <span className={`badge bg-${booking.bookingStatus === 'CONFIRMED'
                      ? 'success'
                      : booking.bookingStatus === 'COMPLETED'
                        ? 'primary'
                        : 'secondary'}`}>
                      {booking.bookingStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`badge bg-${booking.paymentStatus === 'PAID'
                      ? 'success'
                      : booking.paymentStatus === 'PENDING'
                        ? 'warning text-dark'
                        : 'secondary'}`}>
                      {booking.paymentStatus}
                    </span>
                  </td>
                  <td>{new Date(booking.createdAt).toLocaleString('vi-VN')}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleViewDetails(booking)}
                    >
                      Xem
                    </button>
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

      <BookingDetailModal
        open={detailOpen}
        booking={selectedBooking}
        loading={detailLoading}
        onClose={handleCloseDetails}
        context="company"
      />
    </div>
  );
}
