"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { formatPrice } from "../../utils/price"
import { formatTime, formatDate } from "../../utils/formatDate"
import api from "../../services/http"
import type { UserBooking } from "../../types/payment"
import BookingDetailModal from "../../components/common/BookingDetailModal"

interface BookingStats {
  totalBookings: number
  todayBookings: number
  weekBookings: number
  monthBookings: number
  confirmedBookings: number
  cancelledBookings: number
  totalRevenue: number
}

interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
  message?: string
}

interface FilterParams {
  page: number
  limit: number
  search?: string
  status?: string
  paymentStatus?: string
  startDate?: string
  endDate?: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

interface BookingsData {
  bookings: UserBooking[]
  pagination: {
    page: number
    pages: number
    total: number
    limit: number
  }
}

interface StatusColors {
  [key: string]: string
}

interface StatusLabels {
  [key: string]: string
}

export default function ManageBookings() {
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [stats, setStats] = useState<BookingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentStatus: "",
    startDate: "",
    endDate: "",
  })

const [pagination, setPagination] = useState({
  page: 1,
  pages: 1,
  total: 0,
  limit: 10,
})

const [selectedBooking, setSelectedBooking] = useState<UserBooking | null>(null)
const [detailOpen, setDetailOpen] = useState(false)
const [detailLoading, setDetailLoading] = useState(false)

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true)

      const params: FilterParams = {
        page: pagination.page,
        limit: pagination.limit,
      }

      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      const response = await api.get<ApiResponse<BookingsData>>("/admin/bookings", { params })

      if (response.data.success) {
        setBookings(response.data.data.bookings)
        setPagination(response.data.data.pagination)
      }
    } catch (err) {
      const apiError = err as ApiError
      console.error("❌ Error loading bookings:", apiError)
      setError(apiError.response?.data?.message || "Lỗi tải danh sách đặt vé")
    } finally {
      setLoading(false)
    }
  }, [
    pagination.page,
    pagination.limit,
    filters.search,
    filters.status,
    filters.paymentStatus,
    filters.startDate,
    filters.endDate,
  ])

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get<ApiResponse<BookingStats>>("/admin/bookings/stats")
      if (response.data.success) {
        setStats(response.data.data)
      }
    } catch (err) {
      const apiError = err as ApiError
      console.error("❌ Error loading stats:", apiError)
    }
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    loadBookings()
  }

  const getStatusColor = (status: string): string => {
    const colors: StatusColors = {
      CONFIRMED: "success",
      CANCELLED: "danger",
      COMPLETED: "primary",
      PENDING: "warning",
      PAID: "success",
      REFUNDED: "secondary",
    }
    return colors[status] || "secondary"
  }

  const getStatusLabel = (status: string): string => {
    const labels: StatusLabels = {
      CONFIRMED: "Đã xác nhận",
      CANCELLED: "Đã hủy",
      COMPLETED: "Hoàn thành",
      PENDING: "Chờ thanh toán",
      PAID: "Đã thanh toán",
      REFUNDED: "Đã hoàn tiền",
    }
    return labels[status] || status
  }

  const exportBookings = async () => {
    try {
      const response = await api.get("/admin/bookings/export", {
        params: filters,
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.download = `bookings_${new Date().toISOString().split("T")[0]}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("❌ Error exporting bookings:", err)
      alert("Lỗi xuất dữ liệu")
    }
  }

const handleViewDetails = (booking: UserBooking) => {
  setDetailOpen(true)
  setDetailLoading(true)
  setSelectedBooking(booking)
  window.setTimeout(() => {
    setDetailLoading(false)
  }, 200)
}

const handleCloseDetails = () => {
  setDetailOpen(false)
  setSelectedBooking(null)
  setDetailLoading(false)
}

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm("Bạn có chắc muốn hủy vé này?")) return

    try {
      await api.put(`/admin/bookings/${bookingId}/cancel`)
      alert("Hủy vé thành công")
      loadBookings()
    } catch (err) {
      const apiError = err as ApiError
      alert(apiError.response?.data?.message || "Lỗi hủy vé")
    }
  }

  return (
    <>
      <div className="min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <div className="container-fluid pt-4">
        <div className="row align-items-center mb-4 g-3">
          <div className="col">
            <h1 className="display-5 fw-bold mb-1">Quản lý đặt vé</h1>
            <p className="text-muted mb-0">Quản lý và theo dõi tất cả đơn đặt vé</p>
          </div>
          <div className="col-auto d-flex gap-2 flex-wrap">
            <button className="btn btn-outline-secondary" onClick={exportBookings} type="button">
              📥 Xuất Excel
            </button>
            <button className="btn btn-primary" onClick={loadBookings} disabled={loading} type="button">
              {loading ? "⏳ Đang tải..." : "🔄 Làm mới"}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
            <strong>Lỗi:</strong> {error}
            <button type="button" className="btn-close" onClick={() => setError("")}></button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                      <span className="fs-5">📋</span>
                    </div>
                    <div>
                      <p className="text-muted mb-1 small">Tổng đặt vé</p>
                      <h5 className="mb-0 fw-bold">{stats.totalBookings.toLocaleString()}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                      <span className="fs-5">✅</span>
                    </div>
                    <div>
                      <p className="text-muted mb-1 small">Đã xác nhận</p>
                      <h5 className="mb-0 fw-bold">{stats.confirmedBookings.toLocaleString()}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                      <span className="fs-5">📅</span>
                    </div>
                    <div>
                      <p className="text-muted mb-1 small">Hôm nay</p>
                      <h5 className="mb-0 fw-bold">{stats.todayBookings.toLocaleString()}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                      <span className="fs-5">💰</span>
                    </div>
                    <div>
                      <p className="text-muted mb-1 small">Tổng doanh thu</p>
                      <h5 className="mb-0 fw-bold">{formatPrice(stats.totalRevenue)}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <form onSubmit={handleSearch}>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label fw-bold small text-uppercase">Tìm kiếm</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Mã vé, tên, số điện thoại..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label fw-bold small text-uppercase">Trạng thái đặt vé</label>
                  <select
                    className="form-select form-select-lg"
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="CONFIRMED">Đã xác nhận</option>
                    <option value="CANCELLED">Đã hủy</option>
                    <option value="COMPLETED">Hoàn thành</option>
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label fw-bold small text-uppercase">Thanh toán</label>
                  <select
                    className="form-select form-select-lg"
                    value={filters.paymentStatus}
                    onChange={(e) => handleFilterChange("paymentStatus", e.target.value)}
                  >
                    <option value="">Tất cả thanh toán</option>
                    <option value="PENDING">Chờ thanh toán</option>
                    <option value="PAID">Đã thanh toán</option>
                    <option value="CANCELLED">Đã hủy</option>
                    <option value="REFUNDED">Đã hoàn tiền</option>
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label fw-bold small text-uppercase">Từ ngày</label>
                  <input
                    type="date"
                    className="form-control form-control-lg"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label fw-bold small text-uppercase">Đến ngày</label>
                  <input
                    type="date"
                    className="form-control form-control-lg"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-4 d-flex align-items-end">
                  <button type="submit" className="btn btn-primary w-100 btn-lg">
                    🔍 Tìm kiếm
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Table */}
        <div className="card border-0 shadow-sm mb-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="text-muted">Đang tải danh sách đặt vé...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="fw-bold">Mã đặt vé</th>
                    <th className="fw-bold">Hành khách</th>
                    <th className="fw-bold">Chuyến xe</th>
                    <th className="fw-bold">Ghế</th>
                    <th className="fw-bold">Tổng tiền</th>
                    <th className="fw-bold">Trạng thái</th>
                    <th className="fw-bold">Thanh toán</th>
                    <th className="fw-bold">Ngày đặt</th>
                    <th className="fw-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5 text-muted">
                        <p className="mb-0">Không có đặt vé nào</p>
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => {
                      const grossTotal = Number(booking.totalPrice ?? 0);
                      const discount = Number(booking.discountAmount ?? 0);
                      const payable = Number(
                        booking.payableAmount != null
                          ? booking.payableAmount
                          : Math.max(0, grossTotal - discount)
                      );

                      return (
                        <tr key={booking.id}>
                        <td>
                          <span className="fw-bold text-primary">{booking.bookingCode}</span>
                        </td>

                        <td>
                          <div>
                            <p className="mb-1 fw-semibold">{booking.passengerName}</p>
                            <small className="text-muted">{booking.passengerPhone}</small>
                          </div>
                        </td>

                        <td>
                          <div>
                            <p className="mb-1">
                              {booking.trip.departureLocation} → {booking.trip.arrivalLocation}
                            </p>
                            <small className="text-muted">
                              {formatTime(booking.trip.departureTime)} - {formatDate(booking.trip.departureTime)}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {booking.seatNumbers.map((seat, index) => (
                              <span key={index} className="badge bg-light text-dark">
                                {seat}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-bold text-success">{formatPrice(payable)}</span>
                            {discount > 0 && (
                              <small className="text-muted">
                                Giam: -{formatPrice(discount)}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className={`badge bg-${getStatusColor(booking.bookingStatus)} text-white`}>
                            {getStatusLabel(booking.bookingStatus)}
                          </span>
                        </td>

                        <td>
                          <span className={`badge bg-${getStatusColor(booking.paymentStatus)} text-white`}>
                            {getStatusLabel(booking.paymentStatus)}
                          </span>
                        </td>

                        <td>
                          <small className="text-muted">{formatDate(booking.createdAt)}</small>
                        </td>

                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleViewDetails(booking)}
                              type="button"
                            >
                              Xem
                            </button>

                            {booking.bookingStatus === "CONFIRMED" && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleCancelBooking(booking.id)}
                                type="button"
                              >
                                Hủy
                              </button>
                            )}
                          </div>
                        </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="card border-0 shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
              <p className="mb-0 text-muted small">
                Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}
                trong tổng số {pagination.total} kết quả
              </p>

              <div className="d-flex gap-2 align-items-center flex-wrap">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  type="button"
                >
                  ← Trước
                </button>

                <span className="fw-bold">
                  Trang {pagination.page} / {pagination.pages}
                </span>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  type="button"
                >
                  Sau →
                </button>
              </div>
            </div>
        </div>
      )}
      </div>
    </div>

      <BookingDetailModal
        open={detailOpen}
        booking={selectedBooking}
        loading={detailLoading}
        onClose={handleCloseDetails}
        context="admin"
      />
    </>
  )
}
