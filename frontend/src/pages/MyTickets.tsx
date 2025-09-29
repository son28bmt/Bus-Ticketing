import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../services/bookingAPI';
import { formatPrice } from '../utils/price';
import { formatTime, formatDate } from '../utils/formatDate';
import type { UserBooking, ApiError } from '../types/payment';

export default function MyTickets() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filter, setFilter] = useState<string>(''); // ALL, CONFIRMED, CANCELLED, COMPLETED
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      
      interface BookingParams {
        page: number;
        limit: number;
        status?: string;
      }
      
      const params: BookingParams = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filter && filter !== 'ALL') {
        params.status = filter;
      }

      const response = await bookingAPI.getUserBookings(params);
      
      if (response.success) {
        setBookings(response.data.bookings);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      const apiError = err as ApiError;
      console.error('❌ Error loading bookings:', apiError);
      setError(apiError.response?.data?.message || 'Lỗi tải danh sách vé');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Bạn có chắc muốn hủy vé này?')) return;
    
    try {
      await bookingAPI.cancelBooking(bookingId);
      alert('Hủy vé thành công');
      loadBookings();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.response?.data?.message || 'Lỗi hủy vé');
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      CONFIRMED: '#10b981',
      CANCELLED: '#ef4444',
      COMPLETED: '#6366f1',
      PENDING: '#f59e0b',
      PAID: '#10b981',
      REFUNDED: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      CONFIRMED: 'Đã xác nhận',
      CANCELLED: 'Đã hủy',
      COMPLETED: 'Hoàn thành',
      PENDING: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      REFUNDED: 'Đã hoàn tiền'
    };
    return labels[status] || status;
  };

  return (
    <div className="my-tickets-page">
      <div className="container">
        <div className="page-header">
          <h1>🎫 Vé của tôi</h1>
          <p>Quản lý và theo dõi các vé xe đã đặt</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {[
            { key: '', label: 'Tất cả' },
            { key: 'CONFIRMED', label: 'Đã xác nhận' },
            { key: 'COMPLETED', label: 'Hoàn thành' },
            { key: 'CANCELLED', label: 'Đã hủy' }
          ].map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="bookings-list">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Đang tải danh sách vé...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="no-bookings">
              <div className="no-bookings-icon">🎫</div>
              <h3>Chưa có vé nào</h3>
              <p>Bạn chưa đặt vé nào. Hãy tìm chuyến xe phù hợp và đặt vé ngay!</p>
              <Link to="/search" className="btn btn-primary">
                🔍 Tìm chuyến xe
              </Link>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <div className="booking-code">
                    <span className="code-label">Mã vé:</span>
                    <strong>{booking.bookingCode}</strong>
                  </div>
                  <div className="booking-status">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(booking.bookingStatus) }}
                    >
                      {getStatusLabel(booking.bookingStatus)}
                    </span>
                    <span
                      className="status-badge payment"
                      style={{ backgroundColor: getStatusColor(booking.paymentStatus) }}
                    >
                      {getStatusLabel(booking.paymentStatus)}
                    </span>
                  </div>
                </div>

                <div className="booking-content">
                  <div className="trip-info">
                    <div className="route">
                      <div className="route-display">
                        <div className="departure">
                          <div className="location">{booking.trip.departureLocation}</div>
                          <div className="time">
                            {formatTime(booking.trip.departureTime)} - {formatDate(booking.trip.departureTime)}
                          </div>
                        </div>
                        <div className="route-arrow">→</div>
                        <div className="arrival">
                          <div className="location">{booking.trip.arrivalLocation}</div>
                          <div className="time">
                            {formatTime(booking.trip.arrivalTime)} - {formatDate(booking.trip.arrivalTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="booking-details">
                    <div className="detail-row">
                      <span className="label">Hành khách:</span>
                      <span className="value">{booking.passengerName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Điện thoại:</span>
                      <span className="value">{booking.passengerPhone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Ghế:</span>
                      <div className="seats">
                        {booking.seatNumbers.map((seat, index) => (
                          <span key={index} className="seat-badge">
                            {seat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="detail-row">
                      <span className="label">Tổng tiền:</span>
                      <span className="value price">{formatPrice(booking.totalPrice)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Ngày đặt:</span>
                      <span className="value">{formatDate(booking.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="booking-actions">
                  <button 
                    className="btn btn-outline"
                    onClick={() => {/* View details */}}
                  >
                    👁️ Chi tiết
                  </button>
                  
                  {booking.bookingStatus === 'CONFIRMED' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      ❌ Hủy vé
                    </button>
                  )}
                  
                  {booking.paymentStatus === 'PENDING' && (
                    <button className="btn btn-primary">
                      💳 Thanh toán
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-outline"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              ← Trước
            </button>
            
            <span className="page-info">
              Trang {pagination.page} / {pagination.pages}
            </span>
            
            <button
              className="btn btn-outline"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}