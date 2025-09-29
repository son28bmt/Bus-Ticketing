import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/admin';
import './style/ManageTables.css';

type BusLite = { id: number; busNumber: string; busType: string; totalSeats: number; isActive?: boolean };

export default function ManageBuses() {
  const [buses, setBuses] = useState<BusLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ busNumber: '', busType: 'STANDARD', totalSeats: 40, facilities: '', isActive: true });
  const [editing, setEditing] = useState<null | { id: number; busNumber: string; busType: string; totalSeats: number; facilities: string; isActive: boolean }>(null);

  const canSubmit = useMemo(() => form.busNumber && form.busType && form.totalSeats > 0, [form]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAPI.getBuses({ limit: 100 });
  setBuses(res.data.buses || []);
    } catch (e) {
      console.error(e);
      setError('Không thể tải danh sách xe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const payload = {
        busNumber: form.busNumber.trim(),
        busType: form.busType,
        totalSeats: Number(form.totalSeats),
        facilities: form.facilities.split(',').map(s => s.trim()).filter(Boolean),
        isActive: !!form.isActive
      };
      const res = await adminAPI.createBus(payload);
      if (res?.success) {
        setSuccess('Thêm xe thành công!');
        await load();
        setForm({ busNumber: '', busType: 'STANDARD', totalSeats: 40, facilities: '', isActive: true });
      } else {
        setError(res?.message || 'Thêm xe thất bại');
      }
    } catch (e) {
      console.error(e);
      setError('Thêm xe thất bại');
    } finally {
      setLoading(false);
    }
  };

  const onStartEdit = (b: BusLite) => {
    setEditing({ id: b.id, busNumber: b.busNumber, busType: b.busType, totalSeats: b.totalSeats, facilities: '', isActive: b.isActive ?? true });
  };

  const onUpdate = async () => {
    if (!editing) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const payload = {
        busNumber: editing.busNumber.trim(),
        busType: editing.busType,
        totalSeats: Number(editing.totalSeats),
        isActive: !!editing.isActive
      };
      const res = await adminAPI.updateBus(editing.id, payload);
      if (res?.success) {
        setSuccess('Cập nhật xe thành công!');
      } else {
        setError(res?.message || 'Cập nhật xe thất bại');
      }
    } catch (e) {
      console.error(e);
      setError('Cập nhật xe thất bại');
    } finally {
      setLoading(false);
      setEditing(null);
      await load();
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa xe này?')) return;
    try {
      setLoading(true);
      const res = await adminAPI.deleteBus(id);
      if (!res?.success) setError(res?.message || 'Xóa xe thất bại');
    } catch (e) {
      console.error(e);
      setError('Xóa xe thất bại');
    } finally {
      setLoading(false);
      await load();
    }
  };

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-4">Quản lý xe</h1>
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <form onSubmit={onCreate} className="card p-3 mb-5">
        <h2 className="text-xl mb-3">Thêm xe</h2>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div>
            <label>Số xe</label>
            <input value={form.busNumber} onChange={e => setForm(f => ({ ...f, busNumber: e.target.value }))} required />
          </div>
          <div>
            <label>Loại xe</label>
            <select value={form.busType} onChange={e => setForm(f => ({ ...f, busType: e.target.value }))}>
              {['STANDARD','DELUXE','LIMOUSINE','SLEEPER'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>Số ghế</label>
            <input type="number" min={1} value={form.totalSeats} onChange={e => setForm(f => ({ ...f, totalSeats: Number(e.target.value) }))} />
          </div>
          <div>
            <label>Tiện ích (phân tách dấu phẩy)</label>
            <input value={form.facilities} onChange={e => setForm(f => ({ ...f, facilities: e.target.value }))} placeholder="WiFi, Nước, Điều hoà" />
          </div>
        </div>
        <div className="mt-3">
          <button className="btn btn-primary" disabled={loading || !canSubmit}>{loading ? 'Đang lưu...' : 'Thêm xe'}</button>
        </div>
      </form>

      <div className="card p-3">
        <h2 className="text-xl mb-3">Danh sách xe</h2>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Số xe</th><th>Loại</th><th>Số ghế</th><th>Trạng thái</th><th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{editing?.id === b.id ? (
                    <input value={editing.busNumber} onChange={e => setEditing(ed => ed ? { ...ed, busNumber: e.target.value } : ed)} />
                  ) : b.busNumber}</td>
                  <td>{editing?.id === b.id ? (
                    <select value={editing.busType} onChange={e => setEditing(ed => ed ? { ...ed, busType: e.target.value } : ed)}>
                      {['STANDARD','DELUXE','LIMOUSINE','SLEEPER'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : b.busType}</td>
                  <td>{editing?.id === b.id ? (
                    <input type="number" min={1} value={editing.totalSeats} onChange={e => setEditing(ed => ed ? { ...ed, totalSeats: Number(e.target.value) } : ed)} />
                  ) : b.totalSeats}</td>
                  <td>
                    {editing?.id === b.id ? (
                      <select value={editing.isActive ? 'ACTIVE' : 'INACTIVE'} onChange={e => setEditing(ed => ed ? { ...ed, isActive: e.target.value === 'ACTIVE' } : ed)}>
                        <option value="ACTIVE">Sẵn sàng</option>
                        <option value="INACTIVE">Chưa sẵn sàng</option>
                      </select>
                    ) : (
                      <span className={b.isActive ? 'status-badge active' : 'status-badge inactive'}>
                        {b.isActive ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                      </span>
                    )}
                  </td>
                  <td>
                    {editing?.id === b.id ? (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={onUpdate}>Lưu</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Hủy</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => onStartEdit(b)}>Sửa</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(b.id)}>Xóa</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
