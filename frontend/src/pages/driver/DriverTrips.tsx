import { useCallback, useEffect, useMemo, useState } from 'react';
import driverAPI from '../../services/driver';
import type {
  DriverProfileResponse,
  DriverTripsResponse,
  DriverTripDetailPayload
} from '../../types/driver';
import type { Trip } from '../../types/trip';
import { toViStatus } from '../../utils/status';
import '../../style/driver.css';

type StatusFilter = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'schedule';
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'schedule';
  }
};

const DriverTrips = () => {
  const [profile, setProfile] = useState<DriverProfileResponse['data'] | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10
  });
  const [filters, setFilters] = useState<{ status: StatusFilter }>({ status: 'ALL' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DriverTripDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await driverAPI.getProfile();
      if (res.success) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error('[driver] loadProfile error', err);
    }
  }, []);

  const loadTrips = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, unknown> = { page };
        if (filters.status !== 'ALL') {
          params.status = filters.status;
        }
        const res: DriverTripsResponse = await driverAPI.getTrips(params);
        if (res.success) {
          setTrips(res.data.trips);
          setPagination(res.data.pagination);
        } else {
          setTrips([]);
          setPagination((prev) => ({ ...prev, page: 1, pages: 1, total: 0 }));
          setError(res.message || 'Không thể tải danh sách chuyến xe');
        }
      } catch (err) {
        console.error('[driver] loadTrips error', err);
        setError('Không thể tải danh sách chuyến xe');
        setTrips([]);
      } finally {
        setLoading(false);
      }
    },
    [filters.status]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadTrips(pagination.page)]);
  }, [loadProfile, loadTrips, pagination.page]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadTrips(1);
  }, [loadTrips]);

  const openDetail = async (tripId: number) => {
    try {
      setDetailLoading(true);
      setFeedback(null);
      const res = await driverAPI.getTripDetail(tripId);
      if (res.success) {
        setDetail(res.data);
        setStatusNote('');
        setReportNote('');
      } else {
        setFeedback(res.message || 'Không thể lấy thông tin chuyến xe');
      }
    } catch (err) {
      console.error('[driver] openDetail error', err);
      setFeedback('Không thể lấy thông tin chuyến xe');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setStatusNote('');
    setReportNote('');
    setFeedback(null);
  };

  const handleStatusUpdate = async (newStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    if (!detail) return;
    setStatusSubmitting(true);
    setFeedback(null);
    try {
      const res = await driverAPI.updateTripStatus(detail.trip.id, {
        status: newStatus,
        note: statusNote.trim() ? statusNote.trim() : undefined
      });

      if (res.success) {
        await Promise.all([loadTrips(pagination.page), openDetail(detail.trip.id)]);
        setFeedback('Cập nhật trạng thái thành công');
        setStatusNote('');
      } else {
        setFeedback(res.message || 'Cập nhật trạng thái thất bại');
      }
    } catch (err) {
      console.error('[driver] update status error', err);
      setFeedback('Cập nhật trạng thái thất bại');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!detail || !reportNote.trim()) {
      setFeedback('Vui lòng nhập nội dung báo cáo trước khi gửi');
      return;
    }
    setReportSubmitting(true);
    setFeedback(null);
    try {
      const res = await driverAPI.reportTrip(detail.trip.id, reportNote.trim());
      if (res.success) {
        setFeedback('Đã gửi báo cáo tới nhà xe');
        setReportNote('');
        await openDetail(detail.trip.id);
      } else {
        setFeedback(res.message || 'Gửi báo cáo thất bại');
      }
    } catch (err) {
      console.error('[driver] report error', err);
      setFeedback('Gửi báo cáo thất bại');
    } finally {
      setReportSubmitting(false);
    }
  };

  const availableStatusActions = useMemo(() => {
    if (!detail) return [];
    switch (detail.trip.status) {
      case 'SCHEDULED':
        return [
          { label: 'Bắt đầu chuyến', status: 'IN_PROGRESS' as const },
          { label: 'Hủy chuyến', status: 'CANCELLED' as const }
        ];
      case 'IN_PROGRESS':
        return [
          { label: 'Hoàn thành chuyến', status: 'COMPLETED' as const },
          { label: 'Hủy chuyến', status: 'CANCELLED' as const }
        ];
      default:
        return [];
    }
  }, [detail]);

  const driverName = profile?.driver.user?.name ?? 'Tài xế';

  return (
    <div>
      <div className="driver-stats">
        <div className="driver-card">
          <h3>Tài xế</h3>
          <p>{driverName}</p>
        </div>
        <div className="driver-card">
          <h3>Chuyến sắp tới</h3>
          <p>{profile?.stats.upcomingTrips ?? 0}</p>
        </div>
        <div className="driver-card">
          <h3>Chuyến đã hoàn thành</h3>
          <p>{profile?.stats.completedTrips ?? 0}</p>
        </div>
      </div>

      <div className="driver-card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="driver-status-filter" style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>Trạng thái</label>
          <select
            id="driver-status-filter"
            value={filters.status}
            onChange={(event) => setFilters({ status: event.target.value as StatusFilter })}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            <option value="ALL">Tất cả</option>
            <option value="SCHEDULED">Chờ khởi hành</option>
            <option value="IN_PROGRESS">Đang chạy</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => loadTrips(1)}
          style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}
        >
          Áp dụng lọc
        </button>
        <button
          type="button"
          onClick={refreshAll}
          style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5f5', background: '#fff', cursor: 'pointer' }}
        >
          Làm mới dữ liệu
        </button>
      </div>

      <div className="driver-table">
        {error && (
          <div style={{ padding: '16px', color: '#b91c1c' }}>{error}</div>
        )}
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tuyến</th>
              <th>Khởi hành</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                  Đang tải chuyến xe...
                </td>
              </tr>
            ) : trips.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  Không có chuyến xe nào cho bộ lọc hiện tại
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id}>
                  <td>#{trip.id}</td>
                  <td>
                    {(trip.departureLocation?.name ?? '---') + ' → ' + (trip.arrivalLocation?.name ?? '---')}
                  </td>
                  <td>{new Date(trip.departureTime).toLocaleString('vi-VN')}</td>
                  <td>
                    <span className={`driver-status-badge ${statusBadgeClass(trip.status)}`}>
                      {toViStatus(trip.status)}
                    </span>
                  </td>
                  <td className="driver-actions">
                    <button type="button" onClick={() => openDetail(trip.id)}>
                      {detailLoading && detail?.trip.id === trip.id ? 'Đang tải...' : 'Chi tiết'}
                    </button>
                    {trip.status === 'SCHEDULED' && (
                      <button type="button" onClick={() => handleStatusUpdate('IN_PROGRESS')}>
                        Bắt đầu chuyến
                      </button>
                    )}
                    {trip.status === 'IN_PROGRESS' && (
                      <button type="button" onClick={() => handleStatusUpdate('COMPLETED')}>
                        Hoàn thành
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={() => loadTrips(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
        >
          Trang trước
        </button>
        <div style={{ alignSelf: 'center', color: '#475569' }}>
          Trang {pagination.page} / {pagination.pages}
        </div>
        <button
          type="button"
          onClick={() => loadTrips(Math.min(pagination.pages, pagination.page + 1))}
          disabled={pagination.page >= pagination.pages}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
        >
          Trang sau
        </button>
      </div>

      {detail && (
        <div className="driver-modal-overlay" role="dialog" aria-modal="true">
          <div className="driver-modal">
            <h2>Chuyến #{detail.trip.id}</h2>
            {feedback && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8' }}>
                {feedback}
              </div>
            )}
            <section>
              <h3 style={{ marginTop: 0, fontSize: '1.05rem', color: '#1f2937' }}>Thông tin chung</h3>
              <p><strong>Tuyến:</strong> {(detail.trip.departureLocation?.name ?? '---') + ' → ' + (detail.trip.arrivalLocation?.name ?? '---')}</p>
              <p><strong>Giờ khởi hành:</strong> {new Date(detail.trip.departureTime).toLocaleString('vi-VN')}</p>
              <p><strong>Giờ đến:</strong> {new Date(detail.trip.arrivalTime).toLocaleString('vi-VN')}</p>
              <p><strong>Xe:</strong> {detail.trip.bus?.busNumber} ({detail.trip.bus?.busType})</p>
              <p><strong>Trạng thái:</strong> {toViStatus(detail.trip.status)}</p>
            </section>

            <section>
              <h3 style={{ fontSize: '1.05rem', color: '#1f2937' }}>Di chuyển trạng thái</h3>
              {availableStatusActions.length === 0 ? (
                <p style={{ color: '#64748b' }}>Không còn hành động nào cho chuyến này.</p>
              ) : (
                <>
                  <textarea
                    className="driver-note-input"
                    placeholder="Ghi chú (tùy chọn)"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                  />
                  <div className="driver-form-actions" style={{ marginTop: '12px' }}>
                    {availableStatusActions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        className="primary"
                        onClick={() => handleStatusUpdate(action.status)}
                        disabled={statusSubmitting}
                      >
                        {statusSubmitting ? 'Đang xử lý...' : action.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section>
              <h3 style={{ fontSize: '1.05rem', color: '#1f2937' }}>Gửi báo cáo sự cố</h3>
              <textarea
                className="driver-note-input"
                placeholder="Nhập nội dung báo cáo (ví dụ: hỏng xe, kẹt xe, khách hàng báo hoãn...)"
                value={reportNote}
                onChange={(event) => setReportNote(event.target.value)}
              />
              <div className="driver-form-actions" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={handleReport}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '1.05rem', color: '#1f2937' }}>Hành khách</h3>
              {detail.bookings.length === 0 ? (
                <p style={{ color: '#64748b' }}>Chưa có vé nào được đặt cho chuyến này.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Mã vé</th>
                      <th style={{ padding: '10px' }}>Khách hàng</th>
                      <th style={{ padding: '10px' }}>Ghế</th>
                      <th style={{ padding: '10px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.bookings.map((booking) => (
                      <tr key={booking.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '10px' }}>{booking.bookingCode}</td>
                        <td style={{ padding: '10px' }}>
                          {booking.passengerName} ({booking.passengerPhone})
                        </td>
                        <td style={{ padding: '10px' }}>{(booking.seatNumbers || []).join(', ') || '---'}</td>
                        <td style={{ padding: '10px' }}>{toViStatus(booking.bookingStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h3 style={{ fontSize: '1.05rem', color: '#1f2937' }}>Lịch sử trạng thái</h3>
              {detail.statusLogs.length === 0 ? (
                <p style={{ color: '#64748b' }}>Chưa có lịch sử trạng thái.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {detail.statusLogs.map((log) => (
                    <li key={log.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                      <div><strong>{toViStatus(log.newStatus)}</strong> ({new Date(log.createdAt).toLocaleString('vi-VN')})</div>
                      {log.note && <div style={{ color: '#334155' }}>Ghi chú: {log.note}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {detail.reports.length > 0 && (
              <section>
                <h3 style={{ fontSize: '1.05rem', color: '#1f2937' }}>Báo cáo đã gửi</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detail.reports.map((report) => (
                    <li key={report.id} style={{ padding: '12px', background: '#f1f5f9', borderRadius: '10px' }}>
                      <div>{report.note}</div>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {new Date(report.createdAt).toLocaleString('vi-VN')}
                        {report.company?.name ? ` • Gửi tới ${report.company.name}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="driver-modal-close">
              <button type="button" onClick={closeDetail}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTrips;
