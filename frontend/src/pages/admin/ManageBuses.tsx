import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { adminAPI, type BusCompany } from '../../services/admin';
import { useUserStore } from '../../store/user';
import ROLES from '../../constants/roles';
import '../../style/table.css';
import '../../style/admin-mobile.css';
import { toViStatus, statusVariant } from '../../utils/status';

type BusRow = {
  id: number;
  busNumber: string;
  busType: string;
  totalSeats: number;
  isActive: boolean;
  company?: { id: number; name: string };
};

type ApiBus = {
  id: number;
  busNumber: string;
  busType: string;
  totalSeats: number;
  isActive: boolean;
  company?: { id: number; name: string };
};

interface BusFormState {
  busNumber: string;
  busType: string;
  totalSeats: number;
  facilities: string;
  isActive: boolean;
  companyId: string;
}

const initialForm: BusFormState = {
  busNumber: '',
  busType: 'STANDARD',
  totalSeats: 40,
  facilities: '',
  isActive: true,
  companyId: ''
};

export default function ManageBuses() {
  const { user } = useUserStore();
  const isGlobalAdmin = user?.role === ROLES.ADMIN;

  const [buses, setBuses] = useState<BusRow[]>([]);
  const [companies, setCompanies] = useState<BusCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<BusFormState>(initialForm);
  const [editing, setEditing] = useState<BusRow | null>(null);

  const canSubmit = useMemo(() => {
    if (!form.busNumber.trim() || !form.busType || form.totalSeats <= 0) {
      return false;
    }
    if (isGlobalAdmin && !form.companyId) {
      return false;
    }
    return true;
  }, [form, isGlobalAdmin]);

  const loadBuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAPI.getBuses({ limit: 100 });
      if (res.success) {
        const list: BusRow[] = (res.data?.buses ?? []).map((bus: ApiBus) => ({
          id: bus.id,
          busNumber: bus.busNumber,
          busType: bus.busType,
          totalSeats: bus.totalSeats,
          isActive: bus.isActive,
          company: bus.company ? { id: bus.company.id, name: bus.company.name } : undefined
        }) as BusRow);
        setBuses(list);
      } else {
        setError('Không thể tải danh sách xe');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách xe');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCompanies = useCallback(async () => {
    if (!isGlobalAdmin) return;
    try {
      const res = await adminAPI.getCompanies({ limit: 100 });
      if (res.success) {
        setCompanies(res.data || []);
      }
    } catch (err) {
      console.error('Không thể tải danh sách nhà xe', err);
    }
  }, [isGlobalAdmin]);

  useEffect(() => {
    loadBuses();
    loadCompanies();
  }, [loadBuses, loadCompanies]);

  useEffect(() => {
    if (!isGlobalAdmin && user?.companyId != null) {
      setForm((prev) => ({
        ...prev,
        companyId: String(user.companyId)
      }));
    }
  }, [isGlobalAdmin, user?.companyId]);

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const name = target.name as keyof BusFormState as string;
    const value = target.value;
    setForm((prev) => ({
      ...prev,
      [name]: value as unknown as string | number
    }));
  };

  const resetForm = () => {
    setForm(() => ({
      ...initialForm,
      companyId: isGlobalAdmin ? '' : String(user?.companyId ?? '')
    }));
    setEditing(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const facilitiesArray = form.facilities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (editing) {
        const res = await adminAPI.updateBus(editing.id, {
          busNumber: form.busNumber.trim(),
          busType: form.busType,
          totalSeats: Number(form.totalSeats),
          facilities: facilitiesArray,
          isActive: form.isActive,
          companyId: isGlobalAdmin ? Number(form.companyId) : undefined
        });

        if (res?.success) {
          setSuccess('Cập nhật xe thành công');
          await loadBuses();
          resetForm();
        } else {
          setError(res?.message || 'Cập nhật xe thất bại');
        }
      } else {
        const res = await adminAPI.createBus({
          busNumber: form.busNumber.trim(),
          busType: form.busType,
          totalSeats: Number(form.totalSeats),
          facilities: facilitiesArray,
          isActive: form.isActive,
          companyId: isGlobalAdmin ? Number(form.companyId) : undefined
        });

        if (res?.success) {
          setSuccess('Thêm xe thành công');
          await loadBuses();
          resetForm();
        } else {
          setError(res?.message || 'Thêm xe thất bại');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Không thể lưu xe');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (bus: BusRow) => {
    setEditing(bus);
    setForm({
      busNumber: bus.busNumber,
      busType: bus.busType,
      totalSeats: bus.totalSeats,
      facilities: '',
      isActive: bus.isActive,
      companyId: bus.company?.id ? String(bus.company.id) : ''
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá xe này?')) return;
    try {
      setLoading(true);
      setError(null);
      const res = await adminAPI.deleteBus(id);
      if (!res?.success) {
        setError(res?.message || 'Xoá xe thất bại');
      } else {
        setSuccess('Đã xoá xe');
        await loadBuses();
      }
    } catch (err) {
      console.error(err);
      setError('Không thể xoá xe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 admin-manage-trips">
      <h1 className="text-2xl fw-semibold mb-4">Quản lý xe</h1>
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <form onSubmit={handleSubmit} className="card p-3 mb-5">
        <h2 className="text-xl mb-3">{editing ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h2>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label">
              Số xe <span className="text-danger">*</span>
            </label>
            <input
              className="form-control"
              name="busNumber"
              value={form.busNumber}
              onChange={handleFormChange}
              placeholder="Ví dụ: 51B-12345"
              required
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Loại xe</label>
            <select className="form-select" name="busType" value={form.busType} onChange={handleFormChange}>
              {['STANDARD', 'DELUXE', 'LIMOUSINE', 'SLEEPER'].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Tổng số ghế</label>
            <input
              className="form-control"
              name="totalSeats"
              type="number"
              min={1}
              value={form.totalSeats}
              onChange={handleFormChange}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Tiện ích (cách nhau dấu phẩy)</label>
            <input
              className="form-control"
              name="facilities"
              value={form.facilities}
              onChange={handleFormChange}
              placeholder="WiFi, Điều hòa"
            />
          </div>
          {isGlobalAdmin && (
            <div className="col-12 col-md-6">
              <label className="form-label">
                Nhà xe <span className="text-danger">*</span>
              </label>
              <select className="form-select" name="companyId" value={form.companyId} onChange={handleFormChange} required>
                <option value="">-- Chọn nhà xe --</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="bus-active"
                name="isActive"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isActive: e.currentTarget.checked
                  }))
                }
              />
              <label className="form-check-label" htmlFor="bus-active">
                Đang hoạt động
              </label>
            </div>
          </div>
        </div>
        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-primary" disabled={loading || !canSubmit}>
            {loading ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm xe'}
          </button>
          {editing && (
            <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="card p-3">
        <h2 className="text-xl mb-3">Danh sách xe</h2>
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Số xe</th>
                <th>Loại</th>
                <th>Tổng ghế</th>
                <th>Nhà xe</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {buses.length === 0 ? (
                <tr>
                  <td colSpan={7}>Chưa có xe nào</td>
                </tr>
              ) : (
                buses.map((bus) => (
                  <tr key={bus.id}>
                    <td>{bus.id}</td>
                    <td>{bus.busNumber}</td>
                    <td>{bus.busType}</td>
                    <td>{bus.totalSeats}</td>
                    <td>{bus.company?.name || '-'}</td>
                    <td>
                      <span className={`badge bg-${statusVariant(bus.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                        {toViStatus(bus.isActive ? 'ACTIVE' : 'INACTIVE')}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(bus)}>
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        style={{ marginLeft: 8 }}
                        onClick={() => handleDelete(bus.id)}
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

