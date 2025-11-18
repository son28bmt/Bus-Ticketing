import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { companyAPI, type TripReportItem, type TripReportSummary } from '../../services/company';
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
  const [tripReports, setTripReports] = useState<TripReportItem[]>([]);
  const [tripSummary, setTripSummary] = useState<TripReportSummary | null>(null);
  const [tripReportsLoading, setTripReportsLoading] = useState(false);
  const [tripReportsError, setTripReportsError] = useState<string | null>(null);
  const [tripReportFilters, setTripReportFilters] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [tripReportParams, setTripReportParams] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [selectedReport, setSelectedReport] = useState<TripReportItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const loadTripReports = useCallback(
    async (params: { from: string; to: string }) => {
      try {
        setTripReportsLoading(true);
        setTripReportsError(null);
        const response = await companyAPI.getTripReports({
          from: params.from || undefined,
          to: params.to || undefined,
        });
        if (!response?.success) {
          throw new Error(response?.message || 'Không thể tải báo cáo chuyến.');
        }
        const payload = response.data || { items: [], summary: null };
        setTripReports(Array.isArray(payload.items) ? payload.items : []);
        setTripSummary(payload.summary || null);
      } catch (err) {
        console.error('Company trip reports load error:', err);
        const message = err instanceof Error ? err.message : 'Không thể tải báo cáo chuyến.';
        setTripReportsError(message);
        setTripReports([]);
        setTripSummary(null);
      } finally {
        setTripReportsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTripReports(tripReportParams);
  }, [loadTripReports, tripReportParams]);

  const stats = useMemo(() => computeStats(bookings), [bookings]);
  const totalReports = tripSummary?.totalReports || 0;

  const handleTripFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setTripReportFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleTripFilterSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTripReportParams(tripReportFilters);
  };

  const handleTripFilterReset = () => {
    setTripReportFilters({ from: '', to: '' });
    setTripReportParams({ from: '', to: '' });
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('vi-VN', { hour12: false });
  };

  const handleOpenReportDetail = (report: TripReportItem) => {
    setSelectedReport(report);
    setDetailLoading(true);
    setTimeout(() => setDetailLoading(false), 350);
  };

  const handleCloseReportDetail = () => {
    setSelectedReport(null);
    setDetailLoading(false);
  };

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

      <section className="card p-4 mt-4 shadow-sm">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div>
            <h2 className="h5 mb-1">Báo cáo chuyến (TripReport)</h2>
            <p className="text-muted mb-0">Tổng hợp ghi chú sau hành trình do tài xế gửi lên hệ thống.</p>
          </div>
          <form className="d-flex flex-wrap gap-2" onSubmit={handleTripFilterSubmit}>
            <div className="d-flex flex-column">
              <label htmlFor="report-from" className="form-label mb-1">
                Từ ngày
              </label>
              <input
                id="report-from"
                name="from"
                type="date"
                className="form-control form-control-sm"
                value={tripReportFilters.from}
                onChange={handleTripFilterChange}
              />
            </div>
            <div className="d-flex flex-column">
              <label htmlFor="report-to" className="form-label mb-1">
                Đến ngày
              </label>
              <input
                id="report-to"
                name="to"
                type="date"
                className="form-control form-control-sm"
                value={tripReportFilters.to}
                onChange={handleTripFilterChange}
              />
            </div>
            <div className="d-flex align-items-end gap-2">
              <button className="btn btn-primary btn-sm" type="submit" disabled={tripReportsLoading}>
                {tripReportsLoading ? 'Đang lọc...' : 'Lọc dữ liệu'}
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={handleTripFilterReset}
                disabled={tripReportsLoading}
              >
                Xóa lọc
              </button>
            </div>
          </form>
        </div>

        {tripReportsError && (
          <div className="alert alert-danger" role="alert">
            {tripReportsError}
          </div>
        )}

        <div className="row g-3 mb-3">
          <div className="col-12 col-md-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <p className="text-muted text-uppercase fw-semibold mb-1">Tổng số báo cáo</p>
                <h3 className="display-6">{totalReports}</h3>
                <p className="text-muted mb-0">
                  Cập nhật gần nhất: <strong>{formatDateTime(tripSummary?.lastReportAt)}</strong>
                </p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <p className="text-muted text-uppercase fw-semibold mb-2">Tài xế được nhắc tới nhiều</p>
                {tripSummary?.topDrivers?.length ? (
                  <ul className="list-unstyled mb-0">
                    {tripSummary.topDrivers.map((driver) => (
                      <li key={`${driver.driverId ?? 'n/a'}`} className="d-flex justify-content-between small mb-1">
                        <span>{driver.name}</span>
                        <span className="fw-semibold">{driver.count} lần</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted mb-0 small">Chưa có dữ liệu.</p>
                )}
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <p className="text-muted text-uppercase fw-semibold mb-2">Tuyến có nhiều báo cáo</p>
                {tripSummary?.topRoutes?.length ? (
                  <ul className="list-unstyled mb-0">
                    {tripSummary.topRoutes.map((route) => (
                      <li key={route.route} className="d-flex justify-content-between small mb-1">
                        <span>{route.route}</span>
                        <span className="fw-semibold">{route.count} lần</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted mb-0 small">Chưa có dữ liệu.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          {tripReportsLoading && tripReports.length === 0 ? (
            <div className="p-4 text-center text-muted fst-italic">Đang tải báo cáo chuyến...</div>
          ) : tripReports.length ? (
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Tuyến</th>
                  <th>Tài xế</th>
                  <th>Ghi chú</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tripReports.map((report) => (
                  <tr key={report.id}>
                    <td>{formatDateTime(report.createdAt)}</td>
                    <td>
                      <div className="fw-semibold">{report.trip?.routeLabel || '—'}</div>
                      <small className="text-muted">
                        Khởi hành: {formatDateTime(report.trip?.departureTime)}
                      </small>
                    </td>
                    <td>
                      <div className="fw-semibold">{report.driver?.name || 'Chưa phân công'}</div>
                      {report.driver?.phone && <small className="text-muted">{report.driver.phone}</small>}
                    </td>
                    <td>
                      <div className="text-wrap" style={{ maxWidth: '360px' }}>
                        {report.note}
                      </div>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleOpenReportDetail(report)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-muted">Chưa có báo cáo chuyến nào trong thời gian này.</div>
          )}
        </div>
      </section>
      {selectedReport && (
        <div className="trip-report-overlay" role="dialog" aria-modal="true">
          <div className="trip-report-modal">
            <div className="trip-report-modal__header">
              <h5 className="mb-0">Chi tiết báo cáo chuyến</h5>
              <button type="button" className="btn-close" onClick={handleCloseReportDetail} aria-label="Đóng" />
            </div>
            <div className="trip-report-modal__body">
              {detailLoading ? (
                <div className="trip-report-modal__spinner">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-3 mb-0">Đang tải chi tiết …</p>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <small className="text-muted text-uppercase">Thời gian gửi</small>
                    <p className="fs-6 fw-semibold mb-0">{formatDateTime(selectedReport.createdAt)}</p>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <div className="border rounded p-3 h-100">
                        <small className="text-muted text-uppercase">Tuyến</small>
                        <p className="mb-1 fw-semibold">{selectedReport.trip?.routeLabel || '—'}</p>
                        <p className="mb-0 text-muted">
                          Khởi hành: {formatDateTime(selectedReport.trip?.departureTime)}
                          <br />
                          Dự kiến đến: {formatDateTime(selectedReport.trip?.arrivalTime)}
                        </p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border rounded p-3 h-100">
                        <small className="text-muted text-uppercase">Tài xế</small>
                        <p className="mb-1 fw-semibold">{selectedReport.driver?.name || 'Chưa phân công'}</p>
                        {selectedReport.driver?.phone && (
                          <p className="mb-0 text-muted">{selectedReport.driver.phone}</p>
                        )}
                        {selectedReport.trip?.busNumber && (
                          <p className="mb-0 text-muted">Xe: {selectedReport.trip.busNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <small className="text-muted text-uppercase">Ghi chú</small>
                    <div className="border rounded p-3 bg-light">{selectedReport.note || '—'}</div>
                  </div>
                </>
              )}
            </div>
            <div className="trip-report-modal__footer">
              <button type="button" className="btn btn-secondary" onClick={handleCloseReportDetail}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
