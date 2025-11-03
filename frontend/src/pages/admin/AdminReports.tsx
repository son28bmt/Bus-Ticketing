import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminAPI, type BookingStatsSummary } from '../../services/admin';
import { formatPrice } from '../../utils/price';

const formatPercent = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;

export default function Reports() {
  const [stats, setStats] = useState<BookingStatsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getBookingStats();
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tải thống kê đặt vé');
      }
      if (isMounted.current) {
        setStats(response.data);
      }
    } catch (err) {
      if (isMounted.current) {
        const message = err instanceof Error ? err.message : 'Không thể tải thống kê đặt vé';
        setError(message);
        setStats(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadStats();
    return () => {
      isMounted.current = false;
    };
  }, [loadStats]);

  const derived = useMemo(() => {
    if (!stats) {
      return { confirmationRate: 0, cancellationRate: 0, averageRevenue: 0 };
    }

    const confirmationRate =
      stats.totalBookings > 0 ? (stats.confirmedBookings / stats.totalBookings) * 100 : 0;

    const cancellationRate =
      stats.totalBookings > 0 ? (stats.cancelledBookings / stats.totalBookings) * 100 : 0;

    const averageRevenue =
      stats.confirmedBookings > 0 ? stats.totalRevenue / stats.confirmedBookings : 0;

    return { confirmationRate, cancellationRate, averageRevenue };
  }, [stats]);

  return (
    <div className="container py-5">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3">
        <div>
          <h1 className="mb-1">Báo cáo</h1>
          <p className="text-muted mb-0">
            Tổng quan hiệu suất đặt vé và doanh thu trong hệ thống quản trị.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={loadStats}
          disabled={loading}
        >
          {loading ? 'Đang làm mới...' : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="card p-4 text-center">
          <strong>Đang tải báo cáo...</strong>
        </div>
      ) : stats ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Tổng số lượt đặt vé</h2>
                  <p className="display-6 mb-0">{stats.totalBookings.toLocaleString()}</p>
                  <small className="text-muted">Tất cả thời gian</small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Đặt vé đã xác nhận</h2>
                  <p className="display-6 mb-0">{stats.confirmedBookings.toLocaleString()}</p>
                  <small className="text-muted">
                    {formatPercent(derived.confirmationRate)} trên tổng số
                  </small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Đặt vé đã hủy</h2>
                  <p className="display-6 mb-0">{stats.cancelledBookings.toLocaleString()}</p>
                  <small className="text-muted">
                    {formatPercent(derived.cancellationRate)} trên tổng số
                  </small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Tổng doanh thu</h2>
                  <p className="display-6 mb-0">{formatPrice(stats.totalRevenue)}</p>
                  <small className="text-muted">Từ các vé đã thanh toán</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-3">Hoạt động gần đây</h2>
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <div className="fw-semibold">Hôm nay</div>
                      <div className="text-muted">
                        {stats.todayBookings.toLocaleString()} lượt đặt vé mới
                      </div>
                    </div>
                    <div>
                      <div className="fw-semibold">7 ngày qua</div>
                      <div className="text-muted">
                        {stats.weekBookings.toLocaleString()} lượt đặt vé được tạo
                      </div>
                    </div>
                    <div>
                      <div className="fw-semibold">Tháng này</div>
                      <div className="text-muted">
                        {stats.monthBookings.toLocaleString()} lượt đặt vé được tạo
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-3">Hiệu suất</h2>
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <div className="fw-semibold">Tỷ lệ xác nhận</div>
                      <div className="text-muted">{formatPercent(derived.confirmationRate)}</div>
                    </div>
                    <div>
                      <div className="fw-semibold">Tỷ lệ hủy</div>
                      <div className="text-muted">{formatPercent(derived.cancellationRate)}</div>
                    </div>
                    <div>
                      <div className="fw-semibold">Doanh thu trung bình mỗi vé xác nhận</div>
                      <div className="text-muted">{formatPrice(derived.averageRevenue)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-info" role="status">
          Chưa có dữ liệu báo cáo.
        </div>
      )}
    </div>
  );
}
