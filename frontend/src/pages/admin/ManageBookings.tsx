import React, { useState, useEffect, useCallback } from 'react';
import { formatPrice } from '../../utils/price';
import { formatTime, formatDate } from '../../utils/formatDate';
import api from '../../services/api';
import type { UserBooking } from '../../types/payment';
import './style/ManageBookings.css';

interface BookingStats {
  totalBookings: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface FilterParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface BookingsData {
  bookings: UserBooking[];
  pagination: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
}

interface StatusColors {
  [key: string]: string;
}

interface StatusLabels {
  [key: string]: string;
}

export default function ManageBookings() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentStatus: '',
    startDate: '',
    endDate: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  // Load bookings with useCallback to prevent dependency issues
  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      
      const params: FilterParams = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await api.get<ApiResponse<BookingsData>>('/admin/bookings', { params });
      
      if (response.data.success) {
        setBookings(response.data.data.bookings);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      const apiError = err as ApiError;
      console.error('❌ Error loading bookings:', apiError);
      setError(apiError.response?.data?.message || 'Lỗi tải danh sách đặt vé');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters.search, filters.status, filters.paymentStatus, filters.startDate, filters.endDate]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await api.get<ApiResponse<BookingStats>>('/admin/bookings/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      const apiError = err as ApiError;
      console.error('❌ Error loading stats:', apiError);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadBookings();
  };

  const getStatusColor = (status: string): string => {
    const colors: StatusColors = {
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
    const labels: StatusLabels = {
      CONFIRMED: 'Đã xác nhận',
      CANCELLED: 'Đã hủy',
      COMPLETED: 'Hoàn thành',
      PENDING: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      REFUNDED: 'Đã hoàn tiền'
    };
    return labels[status] || status;
  };

  const exportBookings = async () => {
    try {
      const response = await api.get('/admin/bookings/export', {
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Error exporting bookings:', err);
      alert('Lỗi xuất dữ liệu');
    }
  };

  const handleViewDetails = (bookingId: number) => {
    // TODO: Implement view booking details
    console.log('View booking details:', bookingId);
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Bạn có chắc muốn hủy vé này?')) return;
    
    try {
      await api.put(`/admin/bookings/${bookingId}/cancel`);
      alert('Hủy vé thành công');
      loadBookings();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.response?.data?.message || 'Lỗi hủy vé');
    }
  };

  return (
    <div className="manage-bookings">
      <div className="page-header">
        <div>
          <h1>📋 Quản lý đặt vé</h1>
          <p>Quản lý và theo dõi tất cả đơn đặt vé</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={exportBookings}
            type="button"
          >
            📊 Xuất Excel
          </button>
          <button 
            className="btn btn-primary"
            onClick={loadBookings}
            type="button"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>{stats.totalBookings.toLocaleString()}</h3>
              <p>Tổng đặt vé</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <h3>{stats.todayBookings.toLocaleString()}</h3>
              <p>Hôm nay</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats.confirmedBookings.toLocaleString()}</h3>
              <p>Đã xác nhận</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>{formatPrice(stats.totalRevenue)}</h3>
              <p>Tổng doanh thu</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <form className="filters-form" onSubmit={handleSearch}>
          <div className="filter-group">
            <input
              type="text"
              placeholder="Tìm theo mã vé, tên, số điện thoại..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="form-control"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-control"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="COMPLETED">Hoàn thành</option>
            </select>
          </div>
          
          <div className="filter-group">
            <select
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              className="form-control"
            >
              <option value="">Tất cả thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
          </div>
          
          <div className="filter-group">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="form-control"
              placeholder="Từ ngày"
            />
          </div>
          
          <div className="filter-group">
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="form-control"
              placeholder="Đến ngày"
            />
          </div>
          
          <button type="submit" className="btn btn-primary">
            🔍 Tìm kiếm
          </button>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="bookings-table-container">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Đang tải danh sách đặt vé...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Mã đặt vé</th>
                  <th>Hành khách</th>
                  <th>Chuyến xe</th>
                  <th>Ghế</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th>Ngày đặt</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">
                      <div className="no-data-content">
                        <p>📭 Không có đặt vé nào</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <div className="booking-code">
                          <strong>{booking.bookingCode}</strong>
                        </div>
                      </td>
                      
                      <td>
                        <div className="passenger-info">
                          <div className="passenger-name">{booking.passengerName}</div>
                          <div className="passenger-phone">{booking.passengerPhone}</div>
                        </div>
                      </td>
                      
                      <td>
                        <div className="trip-info">
                          <div className="trip-route">
                            {booking.trip.departureLocation} → {booking.trip.arrivalLocation}
                          </div>
                          <div className="trip-time">
                            {formatTime(booking.trip.departureTime)} - {formatDate(booking.trip.departureTime)}
                          </div>
                        </div>
                      </td>
                      
                      <td>
                        <div className="seats-info">
                          <div className="seats-list">
                            {booking.seatNumbers.map((seat, index) => (
                              <span key={index} className="seat-badge">
                                {seat}
                              </span>
                            ))}
                          </div>
                          <div className="seats-count">
                            {booking.seatNumbers.length} ghế
                          </div>
                        </div>
                      </td>
                      
                      <td>
                        <div className="price-info">
                          <strong>{formatPrice(booking.totalPrice)}</strong>
                        </div>
                      </td>
                      
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(booking.bookingStatus) }}
                        >
                          {getStatusLabel(booking.bookingStatus)}
                        </span>
                      </td>
                      
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(booking.paymentStatus) }}
                        >
                          {getStatusLabel(booking.paymentStatus)}
                        </span>
                      </td>
                      
                      <td>
                        <div className="date-info">
                          {formatDate(booking.createdAt)}
                        </div>
                      </td>
                      
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleViewDetails(booking.id)}
                            title="Xem chi tiết"
                            type="button"
                          >
                            👁️
                          </button>
                          
                          {booking.bookingStatus === 'CONFIRMED' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleCancelBooking(booking.id)}
                              title="Hủy vé"
                              type="button"
                            >
                              ❌
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 
            trong tổng số {pagination.total} kết quả
          </div>
          
          <div className="pagination-controls">
            <button
              className="btn btn-outline"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              type="button"
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
              type="button"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}