import { useCallback, useEffect, useMemo, useState } from 'react';
import { companyAPI } from '../../services/company';
import type { UserBooking } from '../../types/payment';
import { formatPrice } from '../../utils/price';
import { toViStatus, statusVariant } from '../../utils/status';

interface CompanyReportStats {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
}

const SUCCESS_STATUSES = new Set<UserBooking['bookingStatus']>(['CONFIRMED', 'COMPLETED']);

const toAmount = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const resolvePayableAmount = (booking: UserBooking): number => {
  if (booking.payableAmount != null) {
    return Math.max(0, toAmount(booking.payableAmount));
  }
  const total = toAmount(booking.totalPrice);
  const discount = toAmount(booking.discountAmount);
  return Math.max(0, total - discount);
};

const computeStats = (bookings: UserBooking[]): CompanyReportStats => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalRevenue = 0;
  let confirmedBookings = 0;
  let cancelledBookings = 0;
  let todayBookings = 0;
  let weekBookings = 0;
  let monthBookings = 0;

  bookings.forEach(booking => {
    const createdAt = new Date(booking.createdAt);
    if (SUCCESS_STATUSES.has(booking.bookingStatus)) {
      confirmedBookings += 1;
      totalRevenue += resolvePayableAmount(booking);
    } else if (booking.bookingStatus === 'CANCELLED') {
      cancelledBookings += 1;
    }
    if (createdAt >= startOfToday) {
      todayBookings += 1;
    }
    if (createdAt >= startOfWeek) {
      weekBookings += 1;
    }
    if (createdAt >= startOfMonth) {
      monthBookings += 1;
    }
  });

  return {
    totalBookings: bookings.length,
    confirmedBookings,
    cancelledBookings,
    totalRevenue,
    todayBookings,
    weekBookings,
    monthBookings
  };
};

const formatPercent = (numerator: number, denominator: number) => {
  if (!denominator) return '0.0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
};

export default function Reports() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyAPI.getBookings();
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tải dữ liệu báo cáo.');
      }
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Company reports load error:', err);
      const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu báo cáo.';
      setError(message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => computeStats(bookings), [bookings]);

  return (
    <div className="container py-5">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3">
        <div>
          <h1 className="mb-1">Báo cáo nhà xe</h1>
          <p className="text-muted mb-0">Thống kê đặt vé và doanh thu của riêng nhà xe bạn.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      {loading && bookings.length === 0 ? (
        <div className="card p-4 text-center">
          <strong>Đang tải dữ liệu...</strong>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Tổng số lượt đặt vé</h2>
                  <p className="display-6 mb-0">{stats.totalBookings.toLocaleString()}</p>
                  <small className="text-muted">Tính trên toàn bộ lịch sử</small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Đã xác nhận</h2>
                  <p className="display-6 mb-0">{stats.confirmedBookings.toLocaleString()}</p>
                  <small className="text-muted">
                    {formatPercent(stats.confirmedBookings, stats.totalBookings)} tổng số đơn
                  </small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Đã hủy</h2>
                  <p className="display-6 mb-0">{stats.cancelledBookings.toLocaleString()}</p>
                  <small className="text-muted">
                    {formatPercent(stats.cancelledBookings, stats.totalBookings)} tổng số đơn
                  </small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Tổng doanh thu</h2>
                  <p className="display-6 mb-0">{formatPrice(stats.totalRevenue)}</p>
                  <small className="text-muted">Chỉ tính các đơn đã xác nhận</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-3">Hoạt động gần đây</h2>
                  <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                    <li>
                      <div className="fw-semibold">Hôm nay</div>
                      <div className="text-muted">{stats.todayBookings.toLocaleString()} lượt đặt mới</div>
                    </li>
                    <li>
                      <div className="fw-semibold">7 ngày qua</div>
                      <div className="text-muted">{stats.weekBookings.toLocaleString()} lượt đặt</div>
                    </li>
                    <li>
                      <div className="fw-semibold">Tháng này</div>
                      <div className="text-muted">{stats.monthBookings.toLocaleString()} lượt đặt</div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-3">Đơn hàng gần đây</h2>
                  {bookings.slice(0, 5).map(booking => (
                    <div key={booking.id} className="d-flex justify-content-between align-items-start border-bottom py-2">
                      <div>
                        <div className="fw-semibold">#{booking.bookingCode}</div>
                        <div className="text-muted small">
                          {booking.passengerName || 'Khách lẻ'} • {new Date(booking.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold">{formatPrice(resolvePayableAmount(booking))}</div>
                        <div className="small">
                          <span className={`badge bg-${statusVariant(booking.bookingStatus)}`}>
                            {toViStatus(booking.bookingStatus)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && (
                    <div className="text-muted">Chưa có dữ liệu đặt vé.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
