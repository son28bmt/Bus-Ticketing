import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { companyAPI } from "../../services/company";
import type { Trip } from "../../types/trip";
import type { UserBooking } from "../../types/payment";
import { formatPrice } from "../../utils/price";
import { toViStatus } from "../../utils/status";
import "../../style/dashboard.css";

interface CompanyStats {
  totalTrips: number;
  totalBuses: number;
  totalBookings: number;
  totalRevenue: number;
  upcomingTrips: number;
  todayBookings: number;
}

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
          <h3>Hoạt động chính</h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
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
            <button
              onClick={loadData}
              className="view-all-btn"
              style={{ alignSelf: "flex-start" }}
            >
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
                style={{ alignItems: "flex-start", textDecoration: 'none', color: 'inherit' }}
              >
                <div className="booking-info">
                  <strong>
                    {trip.departureLocation?.province} (
                    {trip.departureLocation?.name}) →
                    {trip.arrivalLocation?.province} (
                    {trip.arrivalLocation?.name})
                  </strong>
                  <span>
                    {new Date(trip.departureTime).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="booking-details">
                  <span>{trip.bus?.busNumber || "Chưa gán xe"}</span>
                  <span className="amount">
                    {formatPrice(Number(trip.basePrice || 0))}
                  </span>
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
