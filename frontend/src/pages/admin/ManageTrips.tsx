import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/admin';
import { LOCATIONS } from '../../constants/locations';
import './style/ManageTables.css';
import type { Trip } from '../../types/trip';

export default function ManageTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyId: '',
    busId: '',
    departureLocationId: '',
    arrivalLocationId: '',
    departureTime: '',
    arrivalTime: '',
    basePrice: ''
  });
  const [buses, setBuses] = useState<Array<{ id: number; busNumber: string; busType: string; totalSeats: number }>>([]);
  const [locations, setLocations] = useState<{ departure: Array<{ id: number; name: string }>; arrival: Array<{ id: number; name: string }> }>({ departure: [], arrival: [] });
  const [editing, setEditing] = useState<null | Trip>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [tripDetails, setTripDetails] = useState<{
    trip: Trip;
    bookings: Array<{
      id: number;
      bookingCode: string;
      seatNumbers: number[];
      totalPrice: number;
      passengerName: string;
      passengerPhone: string;
      bookingStatus: string;
      createdAt: string;
      user?: { id: number; name: string; email: string; phone: string };
    }>;
    seatInfo: {
      totalSeats: number;
      bookedSeats: number[];
      availableSeats: number;
      occupancyRate: number;
    };
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      form.busId && form.departureLocationId && form.arrivalLocationId && form.departureTime && form.arrivalTime && form.basePrice
    );
  }, [form]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tripsRes, busesRes, locRes] = await Promise.all([
        adminAPI.getTrips({ limit: 20 }),
        adminAPI.getBuses({ limit: 50 }),
        adminAPI.getLocations()
      ]);
      setTrips(tripsRes.data.trips || []);
      setBuses(busesRes.data.buses || []);
      // ✅ Fallback to static locations if API returns empty
      const apiLocations = locRes.locations || { departure: [], arrival: [] };
      if ((apiLocations.departure?.length || 0) === 0 && (apiLocations.arrival?.length || 0) === 0) {
        const dep = (LOCATIONS.departure || []).map((name, idx) => ({ id: idx + 1, name }));
        const arr = (LOCATIONS.arrival || LOCATIONS.departure || []).map((name, idx) => ({ id: idx + 1000, name }));
        setLocations({ departure: dep, arrival: arr });
      } else {
        setLocations(apiLocations);
      }
    } catch (e) {
      setError('Không thể tải dữ liệu quản trị');
      console.error(e);
      // ✅ On error, still provide static fallback so selects are usable
      const dep = (LOCATIONS.departure || []).map((name, idx) => ({ id: idx + 1, name }));
      const arr = (LOCATIONS.arrival || LOCATIONS.departure || []).map((name, idx) => ({ id: idx + 1000, name }));
      setLocations({ departure: dep, arrival: arr });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleViewTripDetails = async (tripId: number) => {
    try {
      setLoadingDetails(true);
      setError(null);
      console.log('🔄 Calling getTripDetails for trip ID:', tripId);
      const res = await adminAPI.getTripDetails(tripId);
      console.log('📝 getTripDetails response:', res);
      if (res?.success) {
        setTripDetails(res.tripDetails);
        setShowTripDetails(true);
        console.log('✅ Trip details loaded successfully');
      } else {
        console.error('❌ API returned error:', res);
        setError(res?.message || 'Không thể tải chi tiết chuyến');
      }
    } catch (err: unknown) {
      console.error('❌ Trip details error:', err);
      let errorMsg = 'Không thể tải chi tiết chuyến';
      if (err && typeof err === 'object') {
        const errObj = err as { response?: { data?: { message?: string } }; message?: string };
        errorMsg = errObj.response?.data?.message || errObj.message || errorMsg;
        console.error('❌ Detailed error:', errObj);
      }
      setError(errorMsg);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const payload = {
        busId: Number(form.busId),
        departureLocationId: Number(form.departureLocationId),
        arrivalLocationId: Number(form.arrivalLocationId),
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
        basePrice: Number(form.basePrice),
        status: 'SCHEDULED'
      };
      console.log('Creating trip with payload:', payload);
      const res = await adminAPI.createTrip(payload);
      if (res?.success) {
        setSuccess('Tạo chuyến thành công!');
        await loadData();
        setForm({
          companyId: '', busId: '', departureLocationId: '', arrivalLocationId: '', departureTime: '', arrivalTime: '', basePrice: ''
        });
      } else {
        setError(res?.message || 'Tạo chuyến thất bại');
      }
    } catch (err: unknown) {
      console.error('Trip creation error:', err);
      let errorMsg = 'Tạo chuyến thất bại';
      if (err && typeof err === 'object') {
        const errObj = err as { response?: { data?: { message?: string } }; message?: string };
        errorMsg = errObj.response?.data?.message || errObj.message || errorMsg;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-4">Quản lý chuyến đi</h1>

      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <div className="card p-3 mb-4">
        <label className="mb-2">Tất cả chuyến xe</label>
        <select value={selectedTripId} onChange={e => {
          const id = Number(e.target.value);
          setSelectedTripId(e.target.value);
          const trip = trips.find(t => t.id === id) || null;
          setEditing(trip);
        }}>
          <option value="">-- Chọn chuyến để xem/sửa --</option>
          {trips.map(t => (
            <option key={t.id} value={t.id}>
              #{t.id} | {(t.departureLocation?.name || '') + ' → ' + (t.arrivalLocation?.name || '')} | {new Date(t.departureTime).toLocaleString('vi-VN')}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCreate} className="card p-3 mb-5">
        <h2 className="text-xl mb-3">Thêm chuyến</h2>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label>Xe</label>
            <select value={form.busId} onChange={e => setForm(f => ({ ...f, busId: e.target.value }))} required>
              <option value="">-- Chọn xe --</option>
              {buses.map(b => (
                <option key={b.id} value={b.id}>{b.busNumber} ({b.busType === 'SLEEPER' ? 'Giường nằm' : (b.busType === 'SEAT' ? 'Ghế ngồi' : b.busType)})</option>
              ))}
            </select>
          </div>
          <div>
            <label>Điểm đi</label>
            <select value={form.departureLocationId} onChange={e => setForm(f => ({ ...f, departureLocationId: e.target.value }))} required>
              <option value="">-- Chọn điểm đi --</option>
              {locations.departure.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Điểm đến</label>
            <select value={form.arrivalLocationId} onChange={e => setForm(f => ({ ...f, arrivalLocationId: e.target.value }))} required>
              <option value="">-- Chọn điểm đến --</option>
              {locations.arrival.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Giờ đi</label>
            <input type="datetime-local" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} required />
          </div>
          <div>
            <label>Giờ đến</label>
            <input type="datetime-local" value={form.arrivalTime} onChange={e => setForm(f => ({ ...f, arrivalTime: e.target.value }))} required />
          </div>
          <div>
            <label>Giá cơ bản (VND)</label>
            <input type="number" min={0} value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))} required />
          </div>
        </div>
        <div className="mt-3">
          <button className="btn btn-primary" disabled={loading || !canSubmit}>
            {loading ? 'Đang lưu...' : 'Thêm chuyến'}
          </button>
        </div>
      </form>

      <div className="card p-3">
        <h2 className="text-xl mb-3">Danh sách chuyến</h2>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Route</th>
                <th>Xe</th>
                <th>Giờ đi</th>
                <th>Giờ đến</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{`${t.departureLocation?.name || ''} → ${t.arrivalLocation?.name || ''}`}</td>
                  <td>{`${t.bus?.busNumber || ''} (${t.bus?.busType || ''})`}</td>
                  <td>{new Date(t.departureTime).toLocaleString('vi-VN')}</td>
                  <td>{new Date(t.arrivalTime).toLocaleString('vi-VN')}</td>
                  <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.basePrice)}</td>
                  <td>{t.status}</td>
                  <td>
                    <button className="btn btn-outline-info btn-sm me-1" onClick={() => handleViewTripDetails(t.id)} disabled={loadingDetails}>
                      {loadingDetails ? 'Đang tải...' : 'Chi tiết'}
                    </button>
                    <button className="btn btn-outline-primary btn-sm me-1" onClick={() => setEditing(t)}>Sửa</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={async () => {
                      if (!confirm('Xóa chuyến này?')) return;
                      try {
                        setLoading(true);
                        const res = await adminAPI.deleteTrip(t.id);
                        if (!res?.success) setError(res?.message || 'Xóa chuyến thất bại');
                        await loadData();
                      } finally {
                        setLoading(false);
                      }
                    }}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing && (
        <div className="card p-3 mt-4">
          <h2 className="text-xl mb-3">Sửa chuyến #{editing.id}</h2>
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <label>Xe</label>
              <select value={editing.bus?.id} onChange={e => setEditing(ed => ed ? { ...ed, bus: { ...ed.bus, id: Number(e.target.value) } } : ed)}>
                {buses.map(b => (
                  <option key={b.id} value={b.id}>{b.busNumber} ({b.busType})</option>
                ))}
              </select>
            </div>
            <div>
              <label>Điểm đi</label>
              <select value={editing.departureLocation?.id} onChange={e => setEditing(ed => ed ? { ...ed, departureLocation: { id: Number(e.target.value), name: locations.departure.find(l => l.id === Number(e.target.value))?.name || '' } } : ed)}>
                {locations.departure.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label>Điểm đến</label>
              <select value={editing.arrivalLocation?.id} onChange={e => setEditing(ed => ed ? { ...ed, arrivalLocation: { id: Number(e.target.value), name: locations.arrival.find(l => l.id === Number(e.target.value))?.name || '' } } : ed)}>
                {locations.arrival.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label>Giờ đi</label>
              <input type="datetime-local" value={new Date(editing.departureTime).toISOString().slice(0,16)} onChange={e => setEditing(ed => ed ? { ...ed, departureTime: new Date(e.target.value).toISOString() } : ed)} />
            </div>
            <div>
              <label>Giờ đến</label>
              <input type="datetime-local" value={new Date(editing.arrivalTime).toISOString().slice(0,16)} onChange={e => setEditing(ed => ed ? { ...ed, arrivalTime: new Date(e.target.value).toISOString() } : ed)} />
            </div>
            <div>
              <label>Giá cơ bản</label>
              <input type="number" min={0} value={editing.basePrice} onChange={e => setEditing(ed => ed ? { ...ed, basePrice: Number(e.target.value) } : ed)} />
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-primary" onClick={async () => {
              if (!editing) return;
              try {
                setLoading(true);
                const payload: Record<string, unknown> = {
                  busId: editing.bus?.id,
                  departureLocationId: editing.departureLocation?.id,
                  arrivalLocationId: editing.arrivalLocation?.id,
                  departureTime: editing.departureTime,
                  arrivalTime: editing.arrivalTime,
                  basePrice: editing.basePrice
                };
                const res = await adminAPI.updateTrip(editing.id, payload);
                if (!res?.success) setError(res?.message || 'Cập nhật chuyến thất bại');
                await loadData();
                setEditing(null);
              } finally {
                setLoading(false);
              }
            }}>Lưu</button>
            <button className="btn btn-secondary ml-2" onClick={() => setEditing(null)}>Hủy</button>
          </div>
        </div>
      )}

      {/* Trip Details Modal */}
      {showTripDetails && tripDetails && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowTripDetails(false)}>
          <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết chuyến #{tripDetails.trip.id}</h5>
                <button type="button" className="btn-close" onClick={() => setShowTripDetails(false)}></button>
              </div>
              <div className="modal-body">
                {/* Trip Information */}
                <div className="card mb-3">
                  <div className="card-header"><strong>Thông tin chuyến</strong></div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p><strong>Tuyến đường:</strong> {tripDetails.trip.departureLocation?.name} → {tripDetails.trip.arrivalLocation?.name}</p>
                        <p><strong>Xe:</strong> {tripDetails.trip.bus?.busNumber} ({tripDetails.trip.bus?.busType === 'SLEEPER' ? 'Giường nằm' : 'Ghế ngồi'})</p>
                        <p><strong>Hãng xe:</strong> {tripDetails.trip.bus?.company?.name}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Giờ đi:</strong> {new Date(tripDetails.trip.departureTime).toLocaleString('vi-VN')}</p>
                        <p><strong>Giờ đến:</strong> {new Date(tripDetails.trip.arrivalTime).toLocaleString('vi-VN')}</p>
                        <p><strong>Giá vé:</strong> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tripDetails.trip.basePrice)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seat Statistics */}
                <div className="card mb-3">
                  <div className="card-header"><strong>Thống kê ghế</strong></div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-3">
                        <h4 className="text-primary">{tripDetails.seatInfo.totalSeats}</h4>
                        <small>Tổng ghế</small>
                      </div>
                      <div className="col-3">
                        <h4 className="text-danger">{tripDetails.seatInfo.bookedSeats.length}</h4>
                        <small>Đã đặt</small>
                      </div>
                      <div className="col-3">
                        <h4 className="text-success">{tripDetails.seatInfo.availableSeats}</h4>
                        <small>Còn trống</small>
                      </div>
                      <div className="col-3">
                        <h4 className="text-info">{tripDetails.seatInfo.occupancyRate}%</h4>
                        <small>Lấp đầy</small>
                      </div>
                    </div>
                    {tripDetails.seatInfo.bookedSeats.length > 0 && (
                      <div className="mt-3">
                        <strong>Ghế đã đặt:</strong>
                        <div className="mt-2">
                          {tripDetails.seatInfo.bookedSeats.map(seat => (
                            <span key={seat} className="badge bg-danger me-1 mb-1">{seat}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bookings List */}
                <div className="card">
                  <div className="card-header"><strong>Danh sách đặt vé ({tripDetails.bookings.length})</strong></div>
                  <div className="card-body">
                    {tripDetails.bookings.length === 0 ? (
                      <p className="text-muted">Chưa có vé nào được đặt</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Mã vé</th>
                              <th>Hành khách</th>
                              <th>SĐT</th>
                              <th>Ghế</th>
                              <th>Tiền</th>
                              <th>Ngày đặt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tripDetails.bookings.map(booking => (
                              <tr key={booking.id}>
                                <td><small>{booking.bookingCode}</small></td>
                                <td>{booking.passengerName || booking.user?.name}</td>
                                <td>{booking.passengerPhone || booking.user?.phone}</td>
                                <td>
                                  {Array.isArray(booking.seatNumbers) && booking.seatNumbers.map(seat => (
                                    <span key={seat} className="badge bg-primary me-1">{seat}</span>
                                  ))}
                                </td>
                                <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.totalPrice)}</td>
                                <td><small>{new Date(booking.createdAt).toLocaleString('vi-VN')}</small></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTripDetails(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Details Modal */}
      {showTripDetails && tripDetails && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '900px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="text-xl font-semibold">Chi tiết chuyến #{tripDetails.trip.id}</h2>
              <button 
                onClick={() => setShowTripDetails(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            {/* Trip Information */}
            <div className="card p-3 mb-4">
              <h3 className="text-lg font-semibold mb-3">Thông tin chuyến xe</h3>
              <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <strong>Tuyến đường:</strong> {tripDetails.trip.departureLocation?.name} → {tripDetails.trip.arrivalLocation?.name}
                </div>
                <div>
                  <strong>Xe:</strong> {tripDetails.trip.bus?.busNumber} ({tripDetails.trip.bus?.busType === 'SLEEPER' ? 'Giường nằm' : tripDetails.trip.bus?.busType === 'SEAT' ? 'Ghế ngồi' : tripDetails.trip.bus?.busType})
                </div>
                <div>
                  <strong>Công ty:</strong> {tripDetails.trip.bus?.company?.name}
                </div>
                <div>
                  <strong>Giá cơ bản:</strong> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tripDetails.trip.basePrice)}
                </div>
                <div>
                  <strong>Giờ đi:</strong> {new Date(tripDetails.trip.departureTime).toLocaleString('vi-VN')}
                </div>
                <div>
                  <strong>Giờ đến:</strong> {new Date(tripDetails.trip.arrivalTime).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>

            {/* Seat Statistics */}
            <div className="card p-3 mb-4">
              <h3 className="text-lg font-semibold mb-3">Thống kê ghế</h3>
              <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div className="text-center p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="text-2xl font-bold text-primary">{tripDetails.seatInfo.totalSeats}</div>
                  <div className="text-sm text-muted">Tổng ghế</div>
                </div>
                <div className="text-center p-3" style={{ backgroundColor: '#fff5f5', borderRadius: '8px' }}>
                  <div className="text-2xl font-bold text-danger">{tripDetails.seatInfo.bookedSeats.length}</div>
                  <div className="text-sm text-muted">Đã đặt</div>
                </div>
                <div className="text-center p-3" style={{ backgroundColor: '#f0fff4', borderRadius: '8px' }}>
                  <div className="text-2xl font-bold text-success">{tripDetails.seatInfo.availableSeats}</div>
                  <div className="text-sm text-muted">Còn trống</div>
                </div>
                <div className="text-center p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="text-2xl font-bold text-info">{tripDetails.seatInfo.occupancyRate}%</div>
                  <div className="text-sm text-muted">Lấp đầy</div>
                </div>
              </div>
            </div>

            {/* Seat Layout Visualization */}
            <div className="card p-3 mb-4">
              <h3 className="text-lg font-semibold mb-3">Sơ đồ ghế</h3>
              
              {/* Seat Legend */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#28a745',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}></div>
                  <span style={{ fontSize: '14px' }}>Trống</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#dc3545',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}></div>
                  <span style={{ fontSize: '14px' }}>Đã đặt</span>
                </div>
              </div>

              {/* Bus Layout */}
              <div style={{ 
                maxWidth: '300px', 
                margin: '0 auto', 
                border: '2px solid #ddd', 
                borderRadius: '20px', 
                padding: '15px',
                backgroundColor: '#f8f9fa'
              }}>
                {/* Driver Section */}
                <div style={{
                  textAlign: 'center',
                  padding: '10px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  🚗 Lái xe
                </div>

                {/* Seats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: tripDetails.trip.bus?.busType === 'SLEEPER' ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                  gap: '8px',
                  justifyItems: 'center'
                }}>
                  {Array.from({ length: tripDetails.seatInfo.totalSeats }, (_, index) => {
                    const seatNumber = index + 1;
                    const isBooked = tripDetails.seatInfo.bookedSeats.includes(seatNumber);
                    
                    return (
                      <div
                        key={seatNumber}
                        style={{
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: isBooked ? '#dc3545' : '#28a745',
                          color: 'white',
                          cursor: 'default'
                        }}
                        title={`Ghế ${seatNumber} - ${isBooked ? 'Đã đặt' : 'Trống'}`}
                      >
                        {seatNumber}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Booked Seats Summary */}
            <div className="card p-3 mb-4">
              <h3 className="text-lg font-semibold mb-3">Danh sách ghế đã đặt</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tripDetails.seatInfo.bookedSeats.map((seatNumber: number) => (
                  <span 
                    key={seatNumber}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    {seatNumber}
                  </span>
                ))}
                {tripDetails.seatInfo.bookedSeats.length === 0 && (
                  <span className="text-muted">Chưa có ghế nào được đặt</span>
                )}
              </div>
            </div>

            {/* Bookings List */}
            <div className="card p-3">
              <h3 className="text-lg font-semibold mb-3">Danh sách đặt vé ({tripDetails.bookings.length} vé)</h3>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã đặt vé</th>
                      <th>Hành khách</th>
                      <th>SĐT</th>
                      <th>Ghế</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                      <th>Ngày đặt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tripDetails.bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>{booking.bookingCode}</td>
                        <td>{booking.passengerName || booking.user?.name || '-'}</td>
                        <td>{booking.passengerPhone || booking.user?.phone || '-'}</td>
                        <td>
                          {Array.isArray(booking.seatNumbers) ? booking.seatNumbers.join(', ') : '-'}
                        </td>
                        <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.totalPrice)}</td>
                        <td>
                          <span className={`badge ${booking.bookingStatus === 'CONFIRMED' ? 'bg-success' : booking.bookingStatus === 'COMPLETED' ? 'bg-primary' : 'bg-secondary'}`}>
                            {booking.bookingStatus}
                          </span>
                        </td>
                        <td>{new Date(booking.createdAt).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tripDetails.bookings.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    Chưa có vé nào được đặt cho chuyến này
                  </div>
                )}
              </div>
            </div>

            <div className="text-center mt-4">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowTripDetails(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
