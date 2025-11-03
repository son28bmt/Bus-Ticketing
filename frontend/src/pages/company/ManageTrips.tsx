import { useCallback, useEffect, useMemo, useState } from 'react';
import { companyAPI } from '../../services/company';
import { tripAPI } from '../../services/http';
import type { Trip } from '../../types/trip';
import { LOCATIONS } from '../../constants/locations';
import '../../style/table.css';
import { toViStatus, statusVariant } from '../../utils/status';

type LocationOption = { id: number; name: string };
type BusOption = { id: number; busNumber: string; busType: string; totalSeats?: number; isActive?: boolean };

type FormState = {
  busId: string;
  departureLocationId: string;
  arrivalLocationId: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: string;
  status: string;
};

const initialForm: FormState = {
  busId: '',
  departureLocationId: '',
  arrivalLocationId: '',
  departureTime: '',
  arrivalTime: '',
  basePrice: '',
  status: 'SCHEDULED'
};

const toInputValue = (iso: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function ManageTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [locations, setLocations] = useState<{ departure: LocationOption[]; arrival: LocationOption[] }>({
    departure: [],
    arrival: []
  });
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tripRes, busRes, locationRes] = await Promise.all([
        companyAPI.getTrips(),
        companyAPI.getBuses(),
        tripAPI.getLocations()
      ]);

      if (!tripRes?.success) {
        throw new Error(tripRes?.message || 'Không thể tải danh sách chuyến xe.');
      }
      if (!busRes?.success) {
        throw new Error(busRes?.message || 'Không thể tải danh sách xe.');
      }

      setTrips(Array.isArray(tripRes.data) ? tripRes.data : []);
      setBuses(Array.isArray(busRes.data) ? busRes.data : []);

      const apiLocations = locationRes.locations;
      if (apiLocations && (apiLocations.departure.length || apiLocations.arrival.length)) {
        setLocations({
          departure: apiLocations.departure.map(loc => ({ id: loc.id, name: loc.name })),
          arrival: apiLocations.arrival.map(loc => ({ id: loc.id, name: loc.name }))
        });
      } else {
        setLocations({
          departure: (LOCATIONS.departure || []).map((name, idx) => ({ id: idx + 1, name })),
          arrival: (LOCATIONS.arrival || LOCATIONS.departure || []).map((name, idx) => ({ id: idx + 1000, name }))
        });
      }
    } catch (err) {
      console.error('Company manage trips load error:', err);
      const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu.';
      setError(message);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = {
      busId: Number(form.busId),
      departureLocationId: Number(form.departureLocationId),
      arrivalLocationId: Number(form.arrivalLocationId),
      departureTime: new Date(form.departureTime).toISOString(),
      arrivalTime: new Date(form.arrivalTime).toISOString(),
      basePrice: Number(form.basePrice),
      status: form.status || 'SCHEDULED'
    };

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = editingTripId
        ? await companyAPI.updateTrip(editingTripId, payload)
        : await companyAPI.createTrip(payload);

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể lưu chuyến xe.');
      }

      setSuccess(editingTripId ? 'Cập nhật chuyến xe thành công!' : 'Tạo chuyến xe thành công!');
      await loadData();
      resetForm();
    } catch (err) {
      console.error('Company manage trips submit error:', err);
      const message = err instanceof Error ? err.message : 'Không thể lưu chuyến xe.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setSuccess(null);
    setError(null);
    setForm({
      busId: trip.bus?.id ? String(trip.bus.id) : String((trip as unknown as { busId?: number }).busId || ''),
      departureLocationId: String(
        trip.departureLocation?.id ??
        (trip as unknown as { departureLocationId?: number }).departureLocationId ??
        ''
      ),
      arrivalLocationId: String(
        trip.arrivalLocation?.id ??
        (trip as unknown as { arrivalLocationId?: number }).arrivalLocationId ??
        ''
      ),
      departureTime: toInputValue(trip.departureTime),
      arrivalTime: toInputValue(trip.arrivalTime),
      basePrice: String(trip.basePrice ?? ''),
      status: trip.status || 'SCHEDULED'
    });
  };

  const handleDelete = async (tripId: number) => {
    if (!confirm('Bạn chắc chắn muốn xóa chuyến xe này?')) return;
    try {
      setLoading(true);
      setError(null);
      const response = await companyAPI.deleteTrip(tripId);
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể xóa chuyến xe.');
      }
      setSuccess('Đã xóa chuyến xe.');
      if (editingTripId === tripId) {
        resetForm();
      }
      await loadData();
    } catch (err) {
      console.error('Company manage trips delete error:', err);
      const message = err instanceof Error ? err.message : 'Không thể xóa chuyến xe.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getLocationName = (location: Trip['departureLocation'] | undefined, fallback?: unknown) => {
    if (location && typeof location === 'object' && 'name' in location && location.name) {
      return location.name as string;
    }
    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      return fallback;
    }
    return 'N/A';
  };

  const getRouteLabel = (trip: Trip) => {
    const route = (trip as unknown as { route?: string }).route;
    if (route && typeof route === 'string') {
      return route;
    }
    const depName = getLocationName(trip.departureLocation, (trip as unknown as { departureLocation?: string }).departureLocation);
    const arrName = getLocationName(trip.arrivalLocation, (trip as unknown as { arrivalLocation?: string }).arrivalLocation);
    return `${depName} -> ${arrName}`;
  };

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-4">Quản lý chuyến xe của nhà xe</h1>
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <form className="card p-3 mb-5" onSubmit={handleSubmit}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="text-xl mb-0">{editingTripId ? 'Chỉnh sửa chuyến xe' : 'Tạo chuyến xe mới'}</h2>
          {editingTripId && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetForm}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label>Chọn xe</label>
            <select
              value={form.busId}
              onChange={event => setForm(prev => ({ ...prev, busId: event.target.value }))}
              required
            >
              <option value="">-- Chọn xe --</option>
              {buses.map(bus => (
                <option key={bus.id} value={bus.id}>
                  {bus.busNumber} ({bus.busType})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Điểm khởi hành</label>
            <select
              value={form.departureLocationId}
              onChange={event => setForm(prev => ({ ...prev, departureLocationId: event.target.value }))}
              required
            >
              <option value="">-- Chọn nơi đi --</option>
              {locations.departure.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Điểm đến</label>
            <select
              value={form.arrivalLocationId}
              onChange={event => setForm(prev => ({ ...prev, arrivalLocationId: event.target.value }))}
              required
            >
              <option value="">-- Chọn nơi đến --</option>
              {locations.arrival.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Giờ khởi hành</label>
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={event => setForm(prev => ({ ...prev, departureTime: event.target.value }))}
              required
            />
          </div>
          <div>
            <label>Giờ đến</label>
            <input
              type="datetime-local"
              value={form.arrivalTime}
              onChange={event => setForm(prev => ({ ...prev, arrivalTime: event.target.value }))}
              required
            />
          </div>
          <div>
            <label>Giá cơ bản (VND)</label>
            <input
              type="number"
              min={0}
              value={form.basePrice}
              onChange={event => setForm(prev => ({ ...prev, basePrice: event.target.value }))}
              required
            />
          </div>
          <div>
            <label>Trạng thái</label>
            <select
              value={form.status}
              onChange={event => setForm(prev => ({ ...prev, status: event.target.value }))}
            >
              {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
                <option key={status} value={status}>{toViStatus(status)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <button className="btn btn-primary" disabled={loading || !canSubmit}>
            {loading ? 'Đang lưu...' : editingTripId ? 'Cập nhật chuyến' : 'Tạo chuyến'}
          </button>
        </div>
      </form>

      <div className="card p-3">
        <h2 className="text-xl mb-3">Danh sách chuyến xe</h2>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tuyến</th>
                <th>Khởi hành</th>
                <th>Đến nơi</th>
                <th>Xe</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(trip => (
                <tr key={trip.id}>
                  <td>{trip.id}</td>
                  <td>{getRouteLabel(trip)}</td>
                  <td>{new Date(trip.departureTime).toLocaleString('vi-VN')}</td>
                  <td>{new Date(trip.arrivalTime).toLocaleString('vi-VN')}</td>
                  <td>{trip.bus?.busNumber || 'Chưa gán xe'}</td>
                  <td>{Number(trip.basePrice || 0).toLocaleString('vi-VN')} đ</td>
                  <td>
                    <span className={`badge bg-${statusVariant(trip.status)}`}>
                      {toViStatus(trip.status)}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => startEdit(trip)}>
                        Sửa
                      </button>
                      <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => handleDelete(trip.id)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trips.length === 0 && (
            <div className="text-center py-4 text-muted">
              Nhà xe chưa có chuyến nào. Hãy tạo chuyến mới để bắt đầu!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
