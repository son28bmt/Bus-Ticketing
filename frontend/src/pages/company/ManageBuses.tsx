import { useCallback, useEffect, useMemo, useState } from 'react';
import { companyAPI } from '../../services/company';
import '../../style/table.css';
import { toViStatus, statusVariant } from '../../utils/status';

type BusForm = {
  busNumber: string;
  busType: string;
  totalSeats: string;
  facilities: string;
  isActive: boolean;
};

type BusRecord = {
  id: number;
  busNumber: string;
  busType: string;
  totalSeats: number;
  capacity?: number;
  facilities?: string[] | null;
  isActive?: boolean;
};

const initialForm: BusForm = {
  busNumber: '',
  busType: 'STANDARD',
  totalSeats: '40',
  facilities: 'WiFi, Điều hòa, Nước uống',
  isActive: true
};

export default function ManageBuses() {
  const [buses, setBuses] = useState<BusRecord[]>([]);
  const [form, setForm] = useState<BusForm>(initialForm);
  const [editingBusId, setEditingBusId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(form.busNumber && form.busType && Number(form.totalSeats) > 0);
  }, [form.busNumber, form.busType, form.totalSeats]);

  const loadBuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyAPI.getBuses();
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tải danh sách xe.');
      }
      setBuses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Company manage buses load error:', err);
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách xe.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuses();
  }, [loadBuses]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingBusId(null);
  };

  const facilitiesArray = (value: string) =>
    value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = {
      busNumber: form.busNumber.trim(),
      busType: form.busType,
      totalSeats: Number(form.totalSeats),
      capacity: Number(form.totalSeats),
      facilities: facilitiesArray(form.facilities),
      isActive: form.isActive
    };

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = editingBusId
        ? await companyAPI.updateBus(editingBusId, payload)
        : await companyAPI.createBus(payload);

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể lưu thông tin xe.');
      }

      setSuccess(editingBusId ? 'Cập nhật xe thành công!' : 'Tạo xe thành công!');
      await loadBuses();
      resetForm();
    } catch (err) {
      console.error('Company manage buses submit error:', err);
      const message = err instanceof Error ? err.message : 'Không thể lưu thông tin xe.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (bus: BusRecord) => {
    setEditingBusId(bus.id);
    setError(null);
    setSuccess(null);
    setForm({
      busNumber: bus.busNumber,
      busType: bus.busType || 'STANDARD',
      totalSeats: String(bus.totalSeats ?? 40),
      facilities: Array.isArray(bus.facilities) ? bus.facilities.join(', ') : '',
      isActive: bus.isActive !== false
    });
  };

  const handleDelete = async (busId: number) => {
    if (!confirm('Bạn chắc chắn muốn xóa xe này?')) return;
    try {
      setLoading(true);
      setError(null);
      const response = await companyAPI.deleteBus(busId);
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể xóa xe.');
      }
      setSuccess('Đã xóa xe.');
      if (editingBusId === busId) {
        resetForm();
      }
      await loadBuses();
    } catch (err) {
      console.error('Company manage buses delete error:', err);
      const message = err instanceof Error ? err.message : 'Không thể xóa xe.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-4">Quản lý xe của nhà xe</h1>
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <form className="card p-3 mb-5" onSubmit={handleSubmit}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="text-xl mb-0">{editingBusId ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h2>
          {editingBusId && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetForm}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div>
            <label>Số xe</label>
            <input
              value={form.busNumber}
              onChange={event => setForm(prev => ({ ...prev, busNumber: event.target.value }))}
              required
            />
          </div>
          <div>
            <label>Loại xe</label>
            <select
              value={form.busType}
              onChange={event => setForm(prev => ({ ...prev, busType: event.target.value }))}
            >
              {['STANDARD', 'DELUXE', 'LIMOUSINE', 'SLEEPER'].map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Số ghế</label>
            <input
              type="number"
              min={1}
              value={form.totalSeats}
              onChange={event => setForm(prev => ({ ...prev, totalSeats: event.target.value }))}
              required
            />
          </div>
          <div>
            <label>Tiện ích (phân tách bằng dấu phẩy)</label>
            <input
              value={form.facilities}
              onChange={event => setForm(prev => ({ ...prev, facilities: event.target.value }))}
              placeholder="WiFi, Điều hòa, Nước uống"
            />
          </div>
          <div>
            <label>Trạng thái</label>
            <select
              value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
              onChange={event => setForm(prev => ({ ...prev, isActive: event.target.value === 'ACTIVE' }))}
            >
              <option value="ACTIVE">{toViStatus('ACTIVE')}</option>
              <option value="INACTIVE">{toViStatus('INACTIVE')}</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <button className="btn btn-primary" disabled={loading || !canSubmit}>
            {loading ? 'Đang lưu...' : editingBusId ? 'Cập nhật xe' : 'Thêm xe'}
          </button>
        </div>
      </form>

      <div className="card p-3">
        <h2 className="text-xl mb-3">Danh sách xe</h2>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Số xe</th>
                <th>Loại</th>
                <th>Số ghế</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(bus => (
                <tr key={bus.id}>
                  <td>{bus.id}</td>
                  <td>{bus.busNumber}</td>
                  <td>{bus.busType}</td>
                  <td>{bus.totalSeats}</td>
                  <td>
                    <span className={`badge bg-${statusVariant(bus.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                      {toViStatus(bus.isActive ? 'ACTIVE' : 'INACTIVE')}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => startEdit(bus)}>
                        Sửa
                      </button>
                      <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => handleDelete(bus.id)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {buses.length === 0 && (
            <div className="text-center py-4 text-muted">
              Nhà xe chưa có xe nào. Hãy thêm xe đầu tiên để quản lý dễ dàng hơn.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
