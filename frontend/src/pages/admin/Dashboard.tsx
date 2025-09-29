import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useUserStore } from '../../store/user';
import './style/Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface RecentBooking {
  id: number;
  customerName: string;
  route: string;
  amount: number;
  time: string;
  status: string;
  bookingCode: string;
}

interface DashboardStats {
  totalTrips: number;
  totalRevenue: number;
  totalBookings: number;
  totalBuses: number;
  totalUsers: number;
  recentBookings: RecentBooking[];
  revenueData: {
    daily: Array<{
      date: string;
      revenue: number;
      bookingCount: number;
      dayName: string;
    }>;
  };
  tripStatusData: { labels: string[], data: number[] };
}

interface TooltipContext {
  label: string;
  parsed: number;
  dataset: {
    data: number[];
  };
}

// ✅ Interface cho Chart.js tooltip context
interface LineChartTooltipItem extends TooltipItem<'line'> {
  dataset: {
    label: string;
    data: number[];
  };
  parsed: {
    x: number;
    y: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTrips: 0,
    totalRevenue: 0,
    totalBookings: 0,
    totalBuses: 0,
    totalUsers: 0,
    recentBookings: [],
    revenueData: { daily: [] },
    tripStatusData: { labels: [], data: [] }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useUserStore();

  // ✅ Sử dụng useCallback để memoize function
  const loadDashboardData = useCallback(async () => {
    if (!token) {
      setError('Không có token xác thực');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading real dashboard data...');
      setLoading(true);
      setError(null);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const API_BASE = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`;

      const [
        overviewRes,
        revenueRes, 
        tripStatsRes,
        recentBookingsRes
      ] = await Promise.all([
        fetch(`${API_BASE}/admin/stats/overview`, { headers }),
        fetch(`${API_BASE}/admin/stats/revenue`, { headers }),
        fetch(`${API_BASE}/admin/stats/trips`, { headers }),
        fetch(`${API_BASE}/admin/activities/bookings`, { headers })
      ]);

      if (!overviewRes.ok) throw new Error(`Overview API error: ${overviewRes.status}`);
      if (!revenueRes.ok) throw new Error(`Revenue API error: ${revenueRes.status}`);
      if (!tripStatsRes.ok) throw new Error(`Trip stats API error: ${tripStatsRes.status}`);
      if (!recentBookingsRes.ok) throw new Error(`Bookings API error: ${recentBookingsRes.status}`);

      const overviewData = await overviewRes.json();
      const revenueData = await revenueRes.json();
      const tripStatsData = await tripStatsRes.json();
      const recentBookingsData = await recentBookingsRes.json();

      console.log('✅ Real data loaded:', {
        overview: overviewData,
        revenue: revenueData,
        tripStats: tripStatsData,
        recentBookings: recentBookingsData.length
      });

      setStats({
        totalTrips: overviewData.totalTrips,
        totalRevenue: overviewData.totalRevenue,
        totalBookings: overviewData.totalBookings,
        totalBuses: overviewData.totalBuses,
        totalUsers: overviewData.totalUsers,
        recentBookings: recentBookingsData,
        revenueData: revenueData,
        tripStatusData: tripStatsData
      });

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Lỗi khi tải dữ liệu');
      
      setStats({
        totalTrips: 0,
        totalRevenue: 0,
        totalBookings: 0,
        totalBuses: 0,
        totalUsers: 0,
        recentBookings: [],
        revenueData: { daily: [] },
        tripStatusData: { labels: ['Không có dữ liệu'], data: [1] }
      });
    } finally {
      setLoading(false);
    }
  }, [token]); // ✅ token là dependency của useCallback

  // ✅ Bây giờ useEffect có thể include loadDashboardData
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); // ✅ Include loadDashboardData trong dependencies

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const revenueChartData = {
    labels: stats.revenueData.daily.map(day => day.dayName),
    datasets: [
      {
        label: 'Doanh thu (VND)',
        data: stats.revenueData.daily.map(day => day.revenue),
        borderColor: '#4299e1',
        backgroundColor: 'rgba(66, 153, 225, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const tripStatusChartData = {
    labels: stats.tripStatusData.labels,
    datasets: [
      {
        data: stats.tripStatusData.data,
        backgroundColor: [
          '#48bb78', // Completed - Green
          '#4299e1', // Scheduled - Blue  
          '#e53e3e'  // Cancelled - Red
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          // ✅ Proper typing cho tooltip callback
          label: function(context: LineChartTooltipItem) {
            return `${context.dataset.label}: ${formatPrice(context.parsed.y)}`;
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          // ✅ Proper typing cho tick callback
          callback: function(value: string | number) {
            return formatPrice(typeof value === 'string' ? parseFloat(value) : value);
          }
        }
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          // ✅ Proper typing cho doughnut tooltip
          label: function(context: TooltipContext) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu thực tế...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <h3>⚠️ Lỗi khi tải dữ liệu</h3>
          <p>{error}</p>
          <button onClick={loadDashboardData} className="retry-btn">
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tổng quan hệ thống</h1>
        <p>Dữ liệu thực tế từ cơ sở dữ liệu ShanBus</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚌</div>
          <div className="stat-content">
            <h3>{stats.totalTrips}</h3>
            <p>Chuyến xe đã lên lịch</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{formatPrice(stats.totalRevenue)}</h3>
            <p>Tổng doanh thu</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <h3>{stats.totalBookings.toLocaleString()}</h3>
            <p>Vé đã đặt</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚐</div>
          <div className="stat-content">
            <h3>{stats.totalBuses}</h3>
            <p>Số xe hoạt động</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Doanh thu 7 ngày qua</h3>
          <div className="chart-container">
            <Line data={revenueChartData} options={lineChartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Trạng thái chuyến xe</h3>
          <div className="chart-container">
            <Doughnut data={tripStatusChartData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="recent-section">
        <div className="recent-bookings">
          <h3>Đặt vé gần đây</h3>
          <div className="bookings-list">
            {stats.recentBookings.length > 0 ? (
              stats.recentBookings.slice(0, 5).map(booking => (
                <div key={booking.id} className="booking-item">
                  <div className="booking-info">
                    <strong>{booking.customerName}</strong>
                    <span>{booking.route}</span>
                    <small>#{booking.bookingCode}</small>
                  </div>
                  <div className="booking-details">
                    <span className="amount">{formatPrice(booking.amount)}</span>
                    <span className="time">{booking.time}</span>
                    <span className={`status status-${booking.status.toLowerCase()}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>Chưa có đặt vé nào gần đây</p>
            )}
          </div>
          <button onClick={loadDashboardData} className="view-all-btn">
            🔄 Làm mới dữ liệu
          </button>
        </div>

        <div className="quick-actions">
          <h3>Thao tác nhanh</h3>
          <div className="actions-grid">
            <button className="action-btn">
              <span>➕</span>
              Thêm chuyến mới
            </button>
            <button className="action-btn">
              <span>🚐</span>
              Thêm xe mới
            </button>
            <button className="action-btn">
              <span>📊</span>
              Xem báo cáo
            </button>
            <button className="action-btn">
              <span>👥</span>
              Quản lý khách hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}