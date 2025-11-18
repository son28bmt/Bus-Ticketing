import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { companyAPI } from "../../services/company";
import type { Trip } from "../../types/trip";
import type { UserBooking } from "../../types/payment";
import { formatPrice } from "../../utils/price";
import { toViStatus } from "../../utils/status";
import "../../style/dashboard.css";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

interface CompanyStats {
  totalTrips: number;
  totalBuses: number;
  totalBookings: number;
  totalRevenue: number;
  upcomingTrips: number;
  todayBookings: number;
}

const resolveBookingRevenue = (booking: UserBooking): number => {
  const total = Number(booking.totalPrice ?? 0);
  if (Number.isFinite(total)) {
    return total;
  }
  return 0;
};

export default function CompanyDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<Array<{ id: number }>>([]);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tripsRes, busesRes, bookingsRes] = await Promise.all([
        companyAPI.getTrips(),
        companyAPI.getBuses(),
        companyAPI.getBookings(),
      ]);

      if (!tripsRes?.success) {
        throw new Error(
          tripsRes?.message || "Không thể tải danh sách chuyến xe."
        );
      }
      if (!busesRes?.success) {
        throw new Error(busesRes?.message || "Không thể tải danh sách xe.");
      }
      if (!bookingsRes?.success) {
        throw new Error(
          bookingsRes?.message || "Không thể tải danh sách đặt vé."
        );
      }

      setTrips(Array.isArray(tripsRes.data) ? tripsRes.data : []);
      setBuses(Array.isArray(busesRes.data) ? busesRes.data : []);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu bảng điều khiển của nhà xe.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo<CompanyStats>(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const totalRevenue = bookings.reduce((sum, booking) => {
      const price = Number((booking.totalPrice as unknown as number) ?? 0);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);
    const totalBookings = bookings.length;
    const todayBookings = bookings.filter((booking) => {
      const createdAt = new Date(booking.createdAt);
      return createdAt >= todayStart && createdAt < todayEnd;
    }).length;

    const upcomingTrips = trips.filter((trip) => {
      const departure = new Date(trip.departureTime);
      return departure >= now;
    }).length;

    return {
      totalTrips: trips.length,
      totalBuses: buses.length,
      totalBookings,
      totalRevenue,
      upcomingTrips,
      todayBookings,
    };
  }, [bookings, buses.length, trips]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [bookings]);

  const upcomingTripsList = useMemo(() => {
    const now = new Date();
    return trips
      .filter((t) => new Date(t.departureTime) >= now)
      .sort(
        (a, b) =>
          new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
      )
      .slice(0, 5);
  }, [trips]);

  const revenueSeries = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        revenue: 0,
        bookings: 0,
      };
    });

    const seriesMap = new Map(days.map((item) => [item.key, item]));

    bookings.forEach((booking) => {
      const created = new Date(booking.createdAt);
      created.setHours(0, 0, 0, 0);
      const key = created.toISOString().slice(0, 10);
      const bucket = seriesMap.get(key);
      if (bucket) {
        bucket.revenue += resolveBookingRevenue(booking);
        bucket.bookings += 1;
      }
    });

    return days;
  }, [bookings]);

  const routeRevenueSeries = useMemo(() => {
    const routeMap = new Map<string, number>();
    bookings.forEach((booking) => {
      const departure = String(booking.trip?.departureLocation || "").trim();
      const arrival = String(booking.trip?.arrivalLocation || "").trim();
      const label =
        departure && arrival ? `${departure} → ${arrival}` : "Chưa xác định";
      const prev = routeMap.get(label) || 0;
      routeMap.set(label, prev + resolveBookingRevenue(booking));
    });

    return Array.from(routeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [bookings]);

  const revenueChartData = useMemo(() => {
    return {
      labels: revenueSeries.map((item) => item.label),
      datasets: [
        {
          label: "Doanh thu (VND)",
          data: revenueSeries.map((item) => item.revenue),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.2)",
          yAxisID: "y",
          tension: 0.35,
        },
        {
          type: "bar" as const,
          label: "Số lượt đặt",
          data: revenueSeries.map((item) => item.bookings),
          backgroundColor: "rgba(16, 185, 129, 0.4)",
          borderRadius: 8,
          yAxisID: "y1",
        },
      ],
    };
  }, [revenueSeries]);

  const revenueChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) =>
              Number(value).toLocaleString("vi-VN"),
          },
        },
        y1: {
          beginAtZero: true,
          position: "right" as const,
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        legend: {
          position: "bottom" as const,
        },
        tooltip: {
          callbacks: {
            label(context: any) {
              const datasetLabel = context.dataset.label || "";
              const value = context.raw;
              if (datasetLabel.includes("Doanh thu")) {
                return `${datasetLabel}: ${formatPrice(Number(value))}`;
              }
              return `${datasetLabel}: ${value}`;
            },
          },
        },
      },
    };
  }, []);

  const routeChartData = useMemo(() => {
    return {
      labels: routeRevenueSeries.map((item) => item[0]),
      datasets: [
        {
          label: "Doanh thu (VND)",
          data: routeRevenueSeries.map((item) => item[1]),
          backgroundColor: [
            "rgba(59, 130, 246, 0.7)",
            "rgba(16, 185, 129, 0.7)",
            "rgba(249, 115, 22, 0.7)",
            "rgba(139, 92, 246, 0.7)",
            "rgba(236, 72, 153, 0.7)",
          ],
          borderRadius: 8,
        },
      ],
    };
  }, [routeRevenueSeries]);

  const routeChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context: any) {
              return formatPrice(Number(context.raw || 0));
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) =>
              Number(value).toLocaleString("vi-VN"),
          },
        },
      },
    }),
    []
  );

  // const companyLabel = useMemo(() => {
  //   // Try to infer company name from loaded trips (either trip.company or bus.company)
  //   for (const t of trips) {
  //     if (t?.company?.name) return t.company.name;
  //     if (t?.bus?.company?.name) return t.bus.company.name;
  //   }
  //   return "Nhà xe của bạn";
  // }, [trips]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Đang tải dữ liệu thống kê của nhà xe...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <h3>Đã xảy ra lỗi</h3>
          <p>{error}</p>
          <button onClick={loadData} className="retry-btn">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Bảng điều khiển</h1>
        <p>Tổng quan hoạt động và đặt vé của</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          {/* <div className="stat-icon">🚌</div> */}
          <div className="stat-content">
            <h3>{stats.totalTrips}</h3>
            <p>Chuyến xe đang quản lý</p>
          </div>
        </div>

        <div className="stat-card">
          {/* <div className="stat-icon">🚐</div> */}
          <div className="stat-content">
            <h3>{stats.totalBuses}</h3>
            <p>Số lượng xe của nhà xe</p>
          </div>
        </div>

        <div className="stat-card">
          {/* <div className="stat-icon">🎫</div> */}
          <div className="stat-content">
            <h3>{stats.totalBookings}</h3>
            <p>Tổng lượt đặt vé</p>
          </div>
        </div>

        <div className="stat-card">
          {/* <div className="stat-icon">💰</div> */}
          <div className="stat-content">
            <h3>{formatPrice(stats.totalRevenue)}</h3>
            <p>Doanh thu tích luỹ</p>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Doanh thu & lượt đặt 7 ngày gần nhất</h3>
          <div className="chart-container">
            {revenueSeries.some((item) => item.revenue > 0 || item.bookings > 0) ? (
              <Line data={revenueChartData} options={revenueChartOptions} />
            ) : (
              <div className="text-muted text-center pt-4">Chưa có dữ liệu thống kê.</div>
            )}
          </div>
        </div>
        <div className="chart-card">
          <h3>Top tuyến theo doanh thu</h3>
          <div className="chart-container">
            {routeRevenueSeries.length ? (
              <Bar data={routeChartData} options={routeChartOptions} />
            ) : (
              <div className="text-muted text-center pt-4">Chưa có dữ liệu tuyến.</div>
            )}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Hoạt động chính</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{stats.upcomingTrips}</strong>
                <div className="text-muted">Chuyến xe sắp khởi hành</div>
              </div>
              <div>
                <strong>{stats.todayBookings}</strong>
                <div className="text-muted">Đặt vé mới hôm nay</div>
              </div>
              <div>
                <strong>{recentBookings.length}</strong>
                <div className="text-muted">Đơn gần nhất</div>
              </div>
            </div>
            <button onClick={loadData} className="view-all-btn" style={{ alignSelf: "flex-start" }}>
              Làm mới dữ liệu
            </button>
          </div>
        </div>

        <div className="chart-card">
          <h3>Chuyến xe sắp tới</h3>
          <div className="bookings-list">
            {upcomingTripsList.map((trip) => (
              <Link
                key={trip.id}
                to={`/trip/${trip.id}`}
                className="booking-item"
                style={{ alignItems: "flex-start", textDecoration: "none", color: "inherit" }}
              >
                <div className="booking-info">
                  <strong>
                    {trip.departureLocation?.province} ({trip.departureLocation?.name}) →
                    {trip.arrivalLocation?.province} ({trip.arrivalLocation?.name})
                  </strong>
                  <span>{new Date(trip.departureTime).toLocaleString("vi-VN")}</span>
                </div>
                <div className="booking-details">
                  <span>{trip.bus?.busNumber || "Chưa gán xe"}</span>
                  <span className="amount">{formatPrice(Number(trip.basePrice || 0))}</span>
                </div>
              </Link>
            ))}

            {upcomingTripsList.length === 0 && (
              <p className="text-muted" style={{ margin: 0 }}>
                Chưa có chuyến xe nào được tạo.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="recent-section">
        <div className="recent-bookings">
          <h3>Đặt vé gần đây</h3>
          <div className="bookings-list">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <div key={booking.id} className="booking-item">
                  <div className="booking-info">
                    <strong>{booking.passengerName || "Khách lẻ"}</strong>
                    <span>
                      {booking.trip?.departureLocation} → {booking.trip?.arrivalLocation}
                    </span>
                    <small>#{booking.bookingCode}</small>
                  </div>
                  <div className="booking-details">
                    <span className="amount">
                      {formatPrice(Number(booking.totalPrice || 0))}
                    </span>
                    <span className="time">
                      {new Date(booking.createdAt).toLocaleString("vi-VN")}
                    </span>
                    <span
                      className={`status status-${booking.bookingStatus?.toLowerCase()}`}
                    >
                      {toViStatus(booking.bookingStatus)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>Chưa có đặt vé nào gần đây.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
