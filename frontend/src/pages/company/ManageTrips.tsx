import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { companyAPI } from '../../services/company';
import type { CompanyDriver } from '../../services/company';
import { tripAPI } from '../../services/http';
import type { Trip } from '../../types/trip';
import { LOCATIONS } from '../../constants/locations';
import '../../style/table.css';
import '../../style/booking-detail.css';
import { toViStatus, statusVariant } from '../../utils/status';

type LocationOption = { id: number; name: string };
type BusOption = { id: number; companyId?: number; busNumber: string; busType: string; totalSeats?: number; isActive?: boolean };

type FormState = {
  busId: string;
  departureLocationId: string;
  arrivalLocationId: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: string;
  status: string;
  driverId: string;
};

const initialForm: FormState = {
  busId: '',
  departureLocationId: '',
  arrivalLocationId: '',
  departureTime: '',
  arrivalTime: '',
  basePrice: '',
  status: 'SCHEDULED',
  driverId: ''
};

const nowLimitValue = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toInputValue = (iso: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

type ConflictTrip = Partial<Trip> & {
  bus?: { id?: number; busNumber?: string } | null;
  driver?: { user?: { name?: string } | null } | null;
};

const formatConflictDetails = (conflict?: ConflictTrip) => {
  if (!conflict) return '';
  const parts: string[] = [];
  const busLabel = conflict.bus?.busNumber || (conflict.busId ? `#${conflict.busId}` : null);
  if (busLabel) parts.push(`Xe ${busLabel}`);
  const driverLabel = conflict.driver?.user?.name;
  if (driverLabel) parts.push(`Tài xế ${driverLabel}`);
  const departureLabel = conflict.departureTime ? new Date(conflict.departureTime).toLocaleString('vi-VN') : null;
  const arrivalLabel = conflict.arrivalTime ? new Date(conflict.arrivalTime).toLocaleString('vi-VN') : null;
  if (departureLabel && arrivalLabel) parts.push(`Khung giờ ${departureLabel} - ${arrivalLabel}`);
  return parts.length ? `(${parts.join(' · ')})` : '';
};

const extractErrorMessage = (error: unknown): string => {
  const fallback = 'Không thể lưu chuyến xe.';
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; conflict?: ConflictTrip } | undefined;
    const base = data?.message || fallback;
    const conflictInfo = formatConflictDetails(data?.conflict);
    return conflictInfo ? `${base} ${conflictInfo}` : base;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

export default function ManageTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [drivers, setDrivers] = useState<CompanyDriver[]>([]);
  const [locations, setLocations] = useState<{ departure: LocationOption[]; arrival: LocationOption[] }>({
    departure: [],
    arrival: []
  });

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  // Modal hủy chuyến
  const [cancelTripTarget, setCancelTripTarget] = useState<Trip | null>(null);
  const [cancelReason, setCancelReason] = useState('Nhà xe hủy chuyến do sự cố kỹ thuật');
  const [cancelNote, setCancelNote] = useState('');
  const [cancelTripError, setCancelTripError] = useState<string | null>(null);
  const [cancelTripLoading, setCancelTripLoading] = useState(false);
  const [detailTripTarget, setDetailTripTarget] = useState<Trip | null>(null);

  const nowLimit = useMemo(() => nowLimitValue(), []);

  const getDriverOptions = useCallback(
    (busIdValue: string) => {
      if (!drivers.length) return [];
      const numericBusId = Number(busIdValue);
      if (!Number.isFinite(numericBusId)) return drivers;
      const bus = buses.find((item) => item.id === numericBusId);
      if (!bus?.companyId) return drivers;
      return drivers.filter((driver) => driver.companyId === bus.companyId);
    },
    [drivers, buses]
  );

  const driverOptionsForForm = useMemo(() => getDriverOptions(form.busId), [form.busId, getDriverOptions]);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.busId &&
        form.departureLocationId &&
        form.arrivalLocationId &&
        form.departureTime &&
        form.arrivalTime &&
        form.basePrice
    );
  }, [form]);

  const isBusBusy = useCallback(
    (busId: number, departureISO: string, arrivalISO: string, ignoreTripId?: number) => {
      if (!busId || !departureISO || !arrivalISO) return false;
      const departureTs = Date.parse(departureISO);
      const arrivalTs = Date.parse(arrivalISO);
      if (!Number.isFinite(departureTs) || !Number.isFinite(arrivalTs) || arrivalTs <= departureTs) return false;

      return trips.some((trip) => {
        const tripBusId = trip.bus?.id ?? (trip as any).busId;
        if (tripBusId !== busId) return false;
        if (ignoreTripId && trip.id === ignoreTripId) return false;
        if (trip.status?.toUpperCase() === 'CANCELLED') return false;

        const tripDep = Date.parse(trip.departureTime);
        const tripArr = Date.parse(trip.arrivalTime);
        if (!Number.isFinite(tripDep) || !Number.isFinite(tripArr)) return false;

        return tripDep < arrivalTs && tripArr > departureTs;
      });
    },
    [trips]
  );

  const isDriverBusy = useCallback(
    (driverId: number, departureISO: string, arrivalISO: string, ignoreTripId?: number) => {
      if (!driverId || !departureISO || !arrivalISO) return false;
      const departureTs = Date.parse(departureISO);
      const arrivalTs = Date.parse(arrivalISO);
      if (!Number.isFinite(departureTs) || !Number.isFinite(arrivalTs) || arrivalTs <= departureTs) return false;

      return trips.some((trip) => {
        const tripDriverId = trip.driver?.id ?? (trip as any).driverId;
        if (!tripDriverId || tripDriverId !== driverId) return false;
        if (ignoreTripId && trip.id === ignoreTripId) return false;
        if (trip.status?.toUpperCase() === 'CANCELLED') return false;

        const tripDep = Date.parse(trip.departureTime);
        const tripArr = Date.parse(trip.arrivalTime);
        if (!Number.isFinite(tripDep) || !Number.isFinite(tripArr)) return false;

        return tripDep < arrivalTs && tripArr > departureTs;
      });
    },
    [trips]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tripRes, busRes, locationRes, driverRes] = await Promise.all([
        companyAPI.getTrips(),
        companyAPI.getBuses(),
        tripAPI.getLocations(),
        companyAPI.getDrivers()
      ]);

      if (!tripRes?.success) throw new Error(tripRes?.message || 'Không thể tải danh sách chuyến xe.');
      if (!busRes?.success) throw new Error(busRes?.message || 'Không thể tải danh sách xe.');

      setTrips(Array.isArray(tripRes.data) ? tripRes.data : []);
      setBuses(Array.isArray(busRes.data) ? busRes.data : []);
      setDrivers(driverRes?.success && Array.isArray(driverRes.data) ? driverRes.data : []);

      const apiLocations = locationRes.locations;
      if (apiLocations && (apiLocations.departure.length || apiLocations.arrival.length)) {
        setLocations({
          departure: apiLocations.departure.map((loc: any) => ({ id: loc.id, name: loc.name })),
          arrival: apiLocations.arrival.map((loc: any) => ({ id: loc.id, name: loc.name }))
        });
      } else {
        setLocations({
          departure: (LOCATIONS.departure || []).map((name: string, idx: number) => ({ id: idx + 1, name })),
          arrival: (LOCATIONS.arrival || LOCATIONS.departure || []).map((name: string, idx: number) => ({ id: idx + 1000, name }))
        });
      }
    } catch (err) {
      console.error('Load data error:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingTripId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = {
      busId: Number(form.busId),
      departureLocationId: Number(form.departureLocationId),
      arrivalLocationId: Number(form.arrivalLocationId),
      departureTime: new Date(form.departureTime).toISOString(),
      arrivalTime: new Date(form.arrivalTime).toISOString(),
      basePrice: Number(form.basePrice),
      status: form.status || 'SCHEDULED',
      driverId: form.driverId ? Number(form.driverId) : null
    };

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = editingTripId
        ? await companyAPI.updateTrip(editingTripId, payload)
        : await companyAPI.createTrip(payload);

      if (!response?.success) throw new Error(response?.message || 'Không thể lưu chuyến xe.');

      setSuccess(editingTripId ? 'Cập nhật chuyến xe thành công!' : 'Tạo chuyến xe thành công!');
      await loadData();
      resetForm();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setError(null);
    setSuccess(null);
    setForm({
      busId: String(trip.bus?.id ?? (trip as any).busId ?? ''),
      departureLocationId: String(trip.departureLocation?.id ?? (trip as any).departureLocationId ?? ''),
      arrivalLocationId: String(trip.arrivalLocation?.id ?? (trip as any).arrivalLocationId ?? ''),
      departureTime: toInputValue(trip.departureTime),
      arrivalTime: toInputValue(trip.arrivalTime),
      basePrice: String(trip.basePrice ?? ''),
      status: trip.status || 'SCHEDULED',
      driverId: String(trip.driver?.id ?? (trip as any).driverId ?? '')
    });
  };

  const handleOpenCancelTrip = (trip: Trip) => {
    setCancelTripTarget(trip);
    setCancelReason('Nhà xe hủy chuyến do sự cố kỹ thuật');
    setCancelNote('');
    setCancelTripError(null);
  };

  const handleCloseCancelTrip = () => {
    if (cancelTripLoading) return;
    setCancelTripTarget(null);
    setCancelNote('');
    setCancelTripError(null);
  };

  const handleSubmitTripCancel = async () => {
    if (!cancelTripTarget) return;
    setCancelTripLoading(true);
    setCancelTripError(null);
    try {
      const res = await companyAPI.cancelTrip(cancelTripTarget.id, { reason: cancelReason, note: cancelNote });
      if (!res?.success) throw new Error(res?.message || 'Không thể hủy chuyến');
      if (res.data?.trip) {
        setTrips(prev => prev.map(t => (t.id === res.data!.trip.id ? res.data!.trip : t)));
      }
      setSuccess('Đã hủy chuyến và thông báo khách hàng.');
      handleCloseCancelTrip();
    } catch (err) {
      setCancelTripError(err instanceof Error ? err.message : 'Không thể hủy chuyến');
    } finally {
      setCancelTripLoading(false);
    }
  };

  const handleOpenTripDetails = (trip: Trip) => {
    setDetailTripTarget(trip);
  };

  const handleCloseTripDetails = () => {
    setDetailTripTarget(null);
  };

  const getLocationName = useCallback((loc: any, fallback?: string) => {
    if (loc && typeof loc === 'object' && loc.name) return loc.name;
    return fallback?.trim() || 'N/A';
  }, []);

  const getRouteLabel = useCallback((trip: Trip) => {
    const dep = getLocationName(trip.departureLocation, (trip as any).departureLocation);
    const arr = getLocationName(trip.arrivalLocation, (trip as any).arrivalLocation);
    return `${dep} → ${arr}`;
  }, [getLocationName]);

  const getSeatStats = (trip: Trip | null) => {
    if (!trip) {
      return { total: 0, available: 0, booked: 0, bookedSeats: [] as string[] };
    }
    const bookedSeats = Array.isArray(trip.bookedSeatNumbers) ? trip.bookedSeatNumbers : [];
    const total =
      trip.totalSeats ??
      trip.bus?.totalSeats ??
      trip.bus?.capacity ??
      trip.bus?.seats?.length ??
      bookedSeats.length;
    const available =
      typeof trip.availableSeats === 'number'
        ? trip.availableSeats
        : Math.max(0, total - bookedSeats.length);
    const booked = total ? Math.max(0, total - available) : bookedSeats.length;
    return { total, available, booked, bookedSeats };
  };

  const filteredTrips = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return trips.filter(trip => {
      const matchStatus = statusFilter === 'ALL' || trip.status === statusFilter;
      const text = [
        getRouteLabel(trip),
        trip.bus?.busNumber,
        trip.driver?.user?.name,
        trip.driver?.user?.email,
        trip.id?.toString()
      ].join(' ').toLowerCase();
      const matchKeyword = !keyword || text.includes(keyword);
      return matchStatus && matchKeyword;
    });
  }, [trips, searchTerm, statusFilter, getRouteLabel]);

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE));
  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTrips.slice(start, start + PAGE_SIZE);
  }, [filteredTrips, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-4">Quản lý chuyến xe của nhà xe</h1>

      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      {/* Form tạo/sửa chuyến */}
      <form className="card p-4 mb-5" onSubmit={handleSubmit}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="text-xl mb-0">{editingTripId ? 'Chỉnh sửa chuyến xe' : 'Tạo chuyến xe mới'}</h2>
          {editingTripId && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetForm}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {/* Xe */}
          <div>
            <label className="form-label">Chọn xe <span className="text-danger">*</span></label>
            <select className="form-select" value={form.busId} onChange={e => {
              const val = e.target.value;
              setForm(prev => ({
                ...prev,
                busId: val,
                driverId: getDriverOptions(val).some(d => String(d.id) === prev.driverId) ? prev.driverId : ''
              }));
            }} required>
              <option value="">-- Chọn xe --</option>
              {buses.map(bus => {
                const busy = isBusBusy(bus.id, form.departureTime, form.arrivalTime, editingTripId ?? undefined);
                return (
                  <option key={bus.id} value={bus.id} disabled={busy}>
                    {bus.busNumber} ({bus.busType}){busy ? ' - Đã có lịch' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tài xế */}
          <div>
            <label className="form-label">Tài xế (tùy chọn)</label>
            <select className="form-select" value={form.driverId} onChange={e => setForm(prev => ({ ...prev, driverId: e.target.value }))}>
              <option value="">-- Chưa phân tài xế --</option>
              {driverOptionsForForm.map(driver => {
                const busy = form.driverId !== String(driver.id) && isDriverBusy(driver.id, form.departureTime, form.arrivalTime, editingTripId ?? undefined);
                const name = driver.user?.name || driver.user?.email || `Tài xế #${driver.id}`;
                return (
                  <option key={driver.id} value={driver.id} disabled={busy}>
                    {name} {driver.phone ? `(${driver.phone})` : ''} {busy ? '- Đang có lịch' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Điểm đi */}
          <div>
            <label className="form-label">Điểm khởi hành <span className="text-danger">*</span></label>
            <select className="form-select" value={form.departureLocationId} onChange={e => setForm(prev => ({ ...prev, departureLocationId: e.target.value }))} required>
              <option value="">-- Chọn nơi đi --</option>
              {locations.departure.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </div>

          {/* Điểm đến */}
          <div>
            <label className="form-label">Điểm đến <span className="text-danger">*</span></label>
            <select className="form-select" value={form.arrivalLocationId} onChange={e => setForm(prev => ({ ...prev, arrivalLocationId: e.target.value }))} required>
              <option value="">-- Chọn nơi đến --</option>
              {locations.arrival.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </div>

          {/* Giờ đi */}
          <div>
            <label className="form-label">Giờ khởi hành <span className="text-danger">*</span></label>
            <input type="datetime-local" className="form-control" value={form.departureTime} min={editingTripId ? undefined : nowLimit}
              onChange={e => setForm(prev => ({ ...prev, departureTime: e.target.value }))} required />
          </div>

          {/* Giờ đến */}
          <div>
            <label className="form-label">Giờ đến nơi <span className="text-danger">*</span></label>
            <input type="datetime-local" className="form-control" value={form.arrivalTime}
              min={form.departureTime || (editingTripId ? undefined : nowLimit)}
              onChange={e => setForm(prev => ({ ...prev, arrivalTime: e.target.value }))} required />
          </div>

          {/* Giá */}
          <div>
            <label className="form-label">Giá cơ bản (VND) <span className="text-danger">*</span></label>
            <input type="number" className="form-control" min="0" value={form.basePrice}
              onChange={e => setForm(prev => ({ ...prev, basePrice: e.target.value }))} required />
          </div>

          {/* Trạng thái */}
          <div>
            <label className="form-label">Trạng thái</label>
            <select className="form-select" value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
              {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
                <option key={s} value={s}>{toViStatus(s)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button className="btn btn-primary" disabled={loading || !canSubmit}>
            {loading ? 'Đang lưu...' : editingTripId ? 'Cập nhật chuyến' : 'Tạo chuyến xe'}
          </button>
        </div>
      </form>

      {/* Danh sách chuyến xe */}
      <div className="card p-4">
        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-3">
          <h2 className="text-xl mb-0">Danh sách chuyến xe</h2>
          <div className="d-flex flex-wrap gap-2">
            <input type="text" className="form-control" style={{ minWidth: 220 }} placeholder="Tìm tuyến, xe, tài xế..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="ALL">Tất cả trạng thái</option>
              {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
                <option key={s} value={s}>{toViStatus(s)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Tuyến</th>
                <th>Khởi hành</th>
                <th>Đến nơi</th>
                <th>Xe</th>
                <th>Tài xế</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrips.map(trip => (
                <tr key={trip.id}>
                  <td>{trip.id}</td>
                  <td><strong>{getRouteLabel(trip)}</strong></td>
                  <td>{new Date(trip.departureTime).toLocaleString('vi-VN')}</td>
                  <td>{new Date(trip.arrivalTime).toLocaleString('vi-VN')}</td>
                  <td>{trip.bus?.busNumber || 'Chưa gắn xe'}</td>
                  <td>{trip.driver?.user?.name || trip.driver?.user?.email || 'Chưa phân'}</td>
                  <td>{Number(trip.basePrice || 0).toLocaleString('vi-VN')} ₫</td>
                  <td>
                    <span className={`badge bg-${statusVariant(trip.status)}`}>
                      {toViStatus(trip.status)}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-outline-info btn-sm" onClick={() => handleOpenTripDetails(trip)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedTrips.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-muted">
                    {trips.length === 0
                      ? 'Nhà xe chưa có chuyến nào. Hãy tạo chuyến mới!'
                      : 'Không tìm thấy chuyến xe nào phù hợp.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted">
            Trang {currentPage}/{totalPages} • {filteredTrips.length} chuyến
          </span>
          <div className="btn-group">
            <button className="btn btn-outline-secondary btn-sm" disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Trước</button>
            <button className="btn btn-outline-secondary btn-sm" disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Sau</button>
          </div>
        </div>
      </div>

      {/* Modal chi tiết chuyến */}
      {detailTripTarget && (
        <div
          className="booking-detail-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && handleCloseTripDetails()}
        >
          <div className="booking-detail-dialog" role="dialog" aria-modal="true">
            <button
              type="button"
              className="booking-detail-close"
              onClick={handleCloseTripDetails}
              aria-label="Đóng"
            >
              ×
            </button>

            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="spinner-border text-primary" role="status" aria-hidden="true" />
              <div>
                <h5 className="modal-title mb-1">Chi tiết chuyến #{detailTripTarget.id}</h5>
                <small className="text-muted">{getRouteLabel(detailTripTarget)}</small>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="border rounded p-3 h-100">
                  <div className="fw-semibold text-uppercase text-muted small mb-1">Khởi hành</div>
                  <div>{new Date(detailTripTarget.departureTime).toLocaleString('vi-VN')}</div>
                  <div className="text-muted small">{detailTripTarget.departureLocation?.name}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="border rounded p-3 h-100">
                  <div className="fw-semibold text-uppercase text-muted small mb-1">Đến nơi</div>
                  <div>{new Date(detailTripTarget.arrivalTime).toLocaleString('vi-VN')}</div>
                  <div className="text-muted small">{detailTripTarget.arrivalLocation?.name}</div>
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">Xe</div>
                  <div className="fw-semibold">{detailTripTarget.bus?.busNumber || 'Chưa gắn xe'}</div>
                  <div className="text-muted small">{detailTripTarget.bus?.busType}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">Tài xế</div>
                  <div className="fw-semibold">
                    {detailTripTarget.driver?.user?.name ||
                      detailTripTarget.driver?.user?.email ||
                      'Chưa phân tài xế'}
                  </div>
                  {detailTripTarget.driver?.user?.phone && (
                    <div className="text-muted small">{detailTripTarget.driver.user.phone}</div>
                  )}
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-3 h-100 text-center">
                  <div className="text-muted small">Trạng thái</div>
                  <span className={`badge bg-${statusVariant(detailTripTarget.status)}`}>
                    {toViStatus(detailTripTarget.status)}
                  </span>
                  <div className="text-muted small mt-2">
                    Giá cơ bản: {Number(detailTripTarget.basePrice || 0).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const seatStats = getSeatStats(detailTripTarget);
              return (
                <>
                  <div className="row text-center g-3 mb-3">
                    <div className="col">
                      <div className="text-muted text-uppercase small">Tổng ghế</div>
                      <div className="fs-4 fw-semibold">{seatStats.total}</div>
                    </div>
                    <div className="col">
                      <div className="text-muted text-uppercase small">Đã đặt</div>
                      <div className="fs-4 fw-semibold text-danger">{seatStats.booked}</div>
                    </div>
                    <div className="col">
                      <div className="text-muted text-uppercase small">Còn trống</div>
                      <div className="fs-4 fw-semibold text-success">{seatStats.available}</div>
                    </div>
                  </div>
                  <div>
                    <h6 className="fw-semibold">Ghế đã đặt</h6>
                    {seatStats.bookedSeats.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {seatStats.bookedSeats.map((seat) => (
                          <span key={seat} className="badge bg-light text-dark border">
                            {seat}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted mb-0">Chưa có ghế nào được đặt.</p>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-secondary" onClick={handleCloseTripDetails}>
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => {
                  if (detailTripTarget) {
                    startEdit(detailTripTarget);
                  }
                  handleCloseTripDetails();
                }}
              >
                Sửa chuyến
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={detailTripTarget.status === 'CANCELLED'}
                onClick={() => {
                  const target = detailTripTarget;
                  handleCloseTripDetails();
                  if (target) {
                    handleOpenCancelTrip(target);
                  }
                }}
              >
                Hủy chuyến & hoàn tiền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hủy chuyến */}
      {cancelTripTarget && (
        <div
          className="booking-detail-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && handleCloseCancelTrip()}
        >
          <div className="booking-detail-dialog" role="dialog" aria-modal="true" style={{ maxWidth: 520 }}>
            <button
              type="button"
              className="booking-detail-close"
              onClick={handleCloseCancelTrip}
              disabled={cancelTripLoading}
              aria-label="Đóng"
            >
              ×
            </button>

            <div className="modal-body">
              <h5 className="mb-3">Hủy chuyến {getRouteLabel(cancelTripTarget)}</h5>
              <p className="text-muted mb-3">
                Tất cả vé đã đặt sẽ được thông báo và hoàn tiền tự động.
              </p>
              <div className="mb-3">
                <label className="form-label fw-bold">Lý do hủy</label>
                <input
                  type="text"
                  className="form-control"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  disabled={cancelTripLoading}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Ghi chú gửi khách (tùy chọn)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={cancelNote}
                  onChange={e => setCancelNote(e.target.value)}
                  disabled={cancelTripLoading}
                  placeholder="Chúng tôi rất tiếc phải hủy chuyến do..."
                ></textarea>
              </div>
              {cancelTripError && <div className="alert alert-danger">{cancelTripError}</div>}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-secondary" onClick={handleCloseCancelTrip} disabled={cancelTripLoading}>
                Đóng
              </button>
              <button type="button" className="btn btn-danger" onClick={handleSubmitTripCancel} disabled={cancelTripLoading}>
                {cancelTripLoading ? 'Đang hủy...' : 'Hủy chuyến & hoàn tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
