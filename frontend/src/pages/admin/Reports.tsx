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
        throw new Error(response?.message || 'Unable to load booking statistics');
      }
      if (isMounted.current) {
        setStats(response.data);
      }
    } catch (err) {
      if (isMounted.current) {
        const message = err instanceof Error ? err.message : 'Unable to load booking statistics';
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
          <h1 className="mb-1">Reports</h1>
          <p className="text-muted mb-0">
            Booking performance and revenue overview for the admin dashboard.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={loadStats}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="card p-4 text-center">
          <strong>Loading reports...</strong>
        </div>
      ) : stats ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Total bookings</h2>
                  <p className="display-6 mb-0">{stats.totalBookings.toLocaleString()}</p>
                  <small className="text-muted">All time</small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Confirmed bookings</h2>
                  <p className="display-6 mb-0">{stats.confirmedBookings.toLocaleString()}</p>
                  <small className="text-muted">{formatPercent(derived.confirmationRate)} of total</small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Cancelled bookings</h2>
                  <p className="display-6 mb-0">{stats.cancelledBookings.toLocaleString()}</p>
                  <small className="text-muted">{formatPercent(derived.cancellationRate)} of total</small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-2">Total revenue</h2>
                  <p className="display-6 mb-0">{formatPrice(stats.totalRevenue)}</p>
                  <small className="text-muted">Confirmed and paid bookings</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-3">Recent activity</h2>
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <div className="fw-semibold">Today</div>
                      <div className="text-muted">
                        {stats.todayBookings.toLocaleString()} new bookings recorded
                      </div>
                    </div>
                    <div>
                      <div className="fw-semibold">Last 7 days</div>
                      <div className="text-muted">
                        {stats.weekBookings.toLocaleString()} bookings created
                      </div>
                    </div>
                    <div>
                      <div className="fw-semibold">This month</div>
                      <div className="text-muted">
                        {stats.monthBookings.toLocaleString()} bookings created
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="fs-6 text-uppercase text-muted mb-3">Efficiency</h2>
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <div className="fw-semibold">Confirmation rate</div>
                      <div className="text-muted">{formatPercent(derived.confirmationRate)}</div>
                    </div>
                    <div>
                      <div className="fw-semibold">Cancellation rate</div>
                      <div className="text-muted">{formatPercent(derived.cancellationRate)}</div>
                    </div>
                    <div>
                      <div className="fw-semibold">Average revenue per confirmed booking</div>
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
          No report data available yet.
        </div>
      )}
    </div>
  );
}
