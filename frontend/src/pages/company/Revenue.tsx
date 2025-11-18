import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { companyAPI } from '../../services/company';
import { formatPrice } from '../../utils/price';
import type { UserBooking } from '../../types/payment';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  revenueByMonth: { month: string; revenue: number }[];
  revenueByTrip: { tripId: string; tripName: string; revenue: number; bookings: number }[];
  revenueByBusType: { busType: string; revenue: number; percentage: number }[];
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

const Revenue: React.FC = () => {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Filter bookings by date range (for future use)
  const filteredBookings = useMemo(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999); // End of day

    return bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= startDate && bookingDate <= endDate;
    });
  }, [bookings, dateRange]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyAPI.getBookings();
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tải dữ liệu doanh thu.');
      }
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Revenue load error:', err);
      const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu doanh thu.';
      setError(message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const revenueData: RevenueData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let weeklyRevenue = 0;
    let dailyRevenue = 0;

    const monthBuckets = new Map<string, number>();
    const tripBuckets = new Map<string, { tripId: string; tripName: string; revenue: number; bookings: number }>();
    const busTypeBuckets = new Map<string, number>();

    filteredBookings.forEach((booking: UserBooking) => {
      if (!SUCCESS_STATUSES.has(booking.bookingStatus)) {
        return;
      }

      const revenue = resolvePayableAmount(booking);
      if (revenue <= 0) {
        return;
      }

      const createdAt = new Date(booking.createdAt);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

      totalRevenue += revenue;

      if (createdAt >= startOfMonth) {
        monthlyRevenue += revenue;
      }
      if (createdAt >= startOfWeek) {
        weeklyRevenue += revenue;
      }
      if (createdAt >= startOfToday) {
        dailyRevenue += revenue;
      }

      monthBuckets.set(monthKey, (monthBuckets.get(monthKey) || 0) + revenue);

      const tripId = booking.trip?.id ? String(booking.trip.id) : `unknown-${booking.id}`;
      const fallbackRoute = [booking.trip?.departureLocation, booking.trip?.arrivalLocation]
        .filter(Boolean)
        .join(' -> ');
      const tripName = booking.trip?.route || fallbackRoute || `Chuyen ${tripId}`;
      const currentTrip =
        tripBuckets.get(tripId) || { tripId, tripName, revenue: 0, bookings: 0 };
      currentTrip.revenue += revenue;
      currentTrip.bookings += 1;
      currentTrip.tripName = tripName;
      tripBuckets.set(tripId, currentTrip);

      const busType = booking.trip?.bus?.busType || 'Unknown';
      busTypeBuckets.set(busType, (busTypeBuckets.get(busType) || 0) + revenue);
    });

    const revenueByMonthArray = Array.from(monthBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));

    const revenueByTripArray = Array.from(tripBuckets.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(item => ({
        tripId: item.tripId,
        tripName: item.tripName,
        revenue: item.revenue,
        bookings: item.bookings
      }));

    const totalBusRevenue = Array.from(busTypeBuckets.values()).reduce((sum, rev) => sum + rev, 0);
    const revenueByBusTypeArray = Array.from(busTypeBuckets.entries()).map(([busType, revenue]) => ({
      busType,
      revenue,
      percentage: totalBusRevenue > 0 ? (revenue / totalBusRevenue) * 100 : 0
    }));
    return {
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      dailyRevenue,
      revenueByMonth: revenueByMonthArray,
      revenueByTrip: revenueByTripArray,
      revenueByBusType: revenueByBusTypeArray
    };
  }, [filteredBookings]);

  const lineChartData = {
    labels: revenueData.revenueByMonth.map(item => item.month),
    datasets: [
      {
        label: 'Doanh thu (VND)',
        data: revenueData.revenueByMonth.map(item => item.revenue),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }
    ]
  };

  const barChartData = {
    labels: revenueData.revenueByTrip.slice(0, 10).map(item => item.tripName),
    datasets: [
      {
        label: 'Doanh thu (VND)',
        data: revenueData.revenueByTrip.slice(0, 10).map(item => item.revenue),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const doughnutChartData = {
    labels: revenueData.revenueByBusType.map(item => item.busType),
    datasets: [
      {
        data: revenueData.revenueByBusType.map(item => item.revenue),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: { label: string; parsed: { y: number } }) => {
            return `Doanh thu: ${formatPrice(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => formatPrice(Number(value))
        }
      }
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1">Báo cáo doanh thu</h1>
          <p className="text-muted mb-0">Thống kê chi tiết doanh thu của nhà xe</p>
        </div>
        <div className="d-flex gap-2">
          <div className="input-group input-group-sm" style={{ maxWidth: '200px' }}>
            <span className="input-group-text">Từ</span>
            <input
              type="date"
              className="form-control"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div className="input-group input-group-sm" style={{ maxWidth: '200px' }}>
            <span className="input-group-text">Đến</span>
            <input
              type="date"
              className="form-control"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={loadBookings}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Đang tải...
              </>
            ) : (
              <>
                Làm mới
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

      {/* Revenue Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border-primary">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-primary mb-1">Tổng doanh thu</h6>
                  <h3 className="mb-0">{formatPrice(revenueData.totalRevenue)}</h3>
                </div>
                <div className="text-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border-success">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-success mb-1">Tháng này</h6>
                  <h3 className="mb-0">{formatPrice(revenueData.monthlyRevenue)}</h3>
                </div>
                <div className="text-success" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border-info">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-info mb-1">Tuần này</h6>
                  <h3 className="mb-0">{formatPrice(revenueData.weeklyRevenue)}</h3>
                </div>
                <div className="text-info" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border-warning">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title text-warning mb-1">Hôm nay</h6>
                  <h3 className="mb-0">{formatPrice(revenueData.dailyRevenue)}</h3>
                </div>
                <div className="text-warning" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        {/* Revenue Trend Chart */}
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Xu hướng doanh thu theo tháng</h5>
            </div>
            <div className="card-body">
              {revenueData.revenueByMonth.length > 0 ? (
                <Line data={lineChartData} options={chartOptions} />
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>Chưa có dữ liệu doanh thu</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue by Bus Type */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Doanh thu theo loại xe</h5>
            </div>
            <div className="card-body">
              {revenueData.revenueByBusType.length > 0 ? (
                <Doughnut
                  data={doughnutChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: { label: string; parsed: number; dataIndex: number }) => {
                            const label = context.label || '';
                            const value = context.parsed;
                            const percentage = revenueData.revenueByBusType[context.dataIndex]?.percentage || 0;
                            return `${label}: ${formatPrice(value)} (${percentage.toFixed(1)}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>Chưa có dữ liệu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Trip Chart */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Top 10 chuyến xe có doanh thu cao nhất</h5>
            </div>
            <div className="card-body">
              {revenueData.revenueByTrip.length > 0 ? (
                <Bar data={barChartData} options={chartOptions} />
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>Chưa có dữ liệu doanh thu theo chuyến</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="row g-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Chi tiết doanh thu theo chuyến xe</h5>
              <span className="badge bg-primary">{revenueData.revenueByTrip.length} chuyến</span>
            </div>
            <div className="card-body">
              {revenueData.revenueByTrip.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Chuyến xe</th>
                        <th className="text-center">Số vé đã bán</th>
                        <th className="text-end">Doanh thu</th>
                        <th className="text-end">Trung bình/vé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.revenueByTrip.map((trip, index) => (
                        <tr key={trip.tripId}>
                          <td>
                            <div className="d-flex align-items-center">
                              <span className="badge bg-secondary me-2">#{index + 1}</span>
                              {trip.tripName}
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-info">{trip.bookings}</span>
                          </td>
                          <td className="text-end fw-bold text-success">
                            {formatPrice(trip.revenue)}
                          </td>
                          <td className="text-end text-muted">
                            {formatPrice(trip.bookings > 0 ? trip.revenue / trip.bookings : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <th>Tổng cộng</th>
                        <th className="text-center">
                          {revenueData.revenueByTrip.reduce((sum, trip) => sum + trip.bookings, 0)}
                        </th>
                        <th className="text-end fw-bold text-primary">
                          {formatPrice(revenueData.revenueByTrip.reduce((sum, trip) => sum + trip.revenue, 0))}
                        </th>
                        <th></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>Chưa có dữ liệu doanh thu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revenue;
