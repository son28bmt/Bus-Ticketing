import { useCallback, useEffect, useMemo, useState } from 'react';
import { companyAPI, type CompanyStaff } from '../../services/company';
import '../../style/table.css';

type RoleOption = 'driver' | 'company';
type StatusOption = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
type RoleFilter = 'ALL' | RoleOption;
type StatusFilter = 'ALL' | StatusOption;

type StaffFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: RoleOption;
  status: StatusOption;
  licenseNumber: string;
};

type FilterState = {
  search: string;
  role: RoleFilter;
  status: StatusFilter;
};

const createInitialForm = (): StaffFormState => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'driver',
  status: 'ACTIVE',
  licenseNumber: ''
});

const createDefaultFilters = (): FilterState => ({
  search: '',
  role: 'ALL',
  status: 'ALL'
});

const ManageStaff = () => {
  const [staff, setStaff] = useState<CompanyStaff[]>([]);
  const [form, setForm] = useState<StaffFormState>(createInitialForm);
  const [filters, setFilters] = useState<FilterState>(createDefaultFilters);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId(null);
    setSuccess(null);
  };

  const resetFilters = () => {
    setFilters(createDefaultFilters());
  };

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await companyAPI.getStaff();
      if (res?.success && Array.isArray(res.data)) {
        setStaff(res.data);
      } else {
        throw new Error(res?.message || 'Khong the tai danh sach nhan vien');
      }
    } catch (err) {
      console.error('loadStaff error', err);
      setError(err instanceof Error ? err.message : 'Khong the tai danh sach nhan vien');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (editingId) {
        const payload: Record<string, unknown> = {
          name: form.name,
          phone: form.phone,
          role: form.role,
          status: form.status,
          licenseNumber: form.licenseNumber || undefined
        };
        if (form.password) {
          payload.password = form.password;
        }
        const res = await companyAPI.updateStaff(editingId, payload);
        if (!res?.success || !res.data) {
          throw new Error(res?.message || 'Cap nhat nhan vien that bai');
        }
      } else {
        if (!form.email || !form.password) {
          setError('Email va mat khau la bat buoc khi tao moi.');
          return;
        }
        const res = await companyAPI.createStaff({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          licenseNumber: form.licenseNumber || undefined
        });
        if (!res?.success || !res.data) {
          throw new Error(res?.message || 'Tao nhan vien that bai');
        }
      }

      await loadStaff();
      setSuccess(editingId ? 'Da cap nhat nhan vien.' : 'Da tao nhan vien.');
      resetForm();
    } catch (err) {
      console.error('submit staff error', err);
      setError(err instanceof Error ? err.message : 'Xu ly that bai');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (entry: CompanyStaff) => {
    setEditingId(entry.id);
    setForm({
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      password: '',
      role: entry.role,
      status: entry.status,
      licenseNumber: entry.driverProfile?.licenseNumber || ''
    });
    setSuccess(null);
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Ban chac chan muon xoa nhan vien nay?')) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await companyAPI.deleteStaff(id);
      if (!res?.success) {
        throw new Error(res?.message || 'Xoa nhan vien that bai');
      }
      if (editingId === id) {
        resetForm();
      }
      await loadStaff();
      setSuccess('Da xoa nhan vien.');
    } catch (err) {
      console.error('delete staff error', err);
      setError(err instanceof Error ? err.message : 'Xoa nhan vien that bai');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (entry: CompanyStaff) => {
    const nextStatus: StatusOption = entry.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await companyAPI.updateStaffStatus(entry.id, nextStatus);
      if (!res?.success) {
        throw new Error(res?.message || 'Cap nhat trang thai that bai');
      }
      await loadStaff();
      setSuccess('Da cap nhat trang thai nhan vien.');
    } catch (err) {
      console.error('toggle status error', err);
      setError(err instanceof Error ? err.message : 'Cap nhat trang thai that bai');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staff.filter((entry) => {
      if (filters.role !== 'ALL' && entry.role !== filters.role) {
        return false;
      }
      if (filters.status !== 'ALL' && entry.status !== filters.status) {
        return false;
      }
      if (filters.search.trim()) {
        const keyword = filters.search.trim().toLowerCase();
        const haystack = [
          entry.name,
          entry.email,
          entry.phone || '',
          entry.driverProfile?.licenseNumber || ''
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(keyword)) {
          return false;
        }
      }
      return true;
    });
  }, [staff, filters]);

  const hasActiveFilters =
    filters.role !== 'ALL' || filters.status !== 'ALL' || Boolean(filters.search.trim());

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-4">Quan ly nhan vien</h1>
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <form className="card p-3 mb-5" onSubmit={handleSubmit}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="text-xl mb-0">{editingId ? 'Chinh sua nhan vien' : 'Them nhan vien moi'}</h2>
          {editingId && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetForm}>
              Huy
            </button>
          )}
        </div>

        <div className="row g-3">
          <div className="col-md-4">
            <label>Ho ten</label>
            <input
              type="text"
              className="form-control"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="col-md-4">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required={!editingId}
              disabled={Boolean(editingId)}
            />
          </div>
          <div className="col-md-4">
            <label>So dien thoai</label>
            <input
              type="tel"
              className="form-control"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>
          <div className="col-md-4">
            <label>Mat khau {editingId ? '(de trong neu khong doi)' : ''}</label>
            <input
              type="password"
              className="form-control"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required={!editingId}
              placeholder={editingId ? '********' : ''}
            />
          </div>
          <div className="col-md-4">
            <label>Vai tro</label>
            <select
              className="form-select"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as RoleOption }))}
            >
              <option value="driver">Tai xe</option>
              <option value="company">Quan tri vien</option>
            </select>
          </div>
          <div className="col-md-4">
            <label>Trang thai</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as StatusOption }))}
            >
              <option value="ACTIVE">Hoat dong</option>
              <option value="INACTIVE">Tam dung</option>
              <option value="SUSPENDED">Khoa</option>
            </select>
          </div>
          {form.role === 'driver' && (
            <div className="col-md-4">
              <label>So GPLX</label>
              <input
                type="text"
                className="form-control"
                value={form.licenseNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, licenseNumber: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="mt-3">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Dang luu...' : editingId ? 'Cap nhat nhan vien' : 'Tao nhan vien'}
          </button>
        </div>
      </form>

      <div className="card p-3 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-6 col-lg-4">
            <label className="form-label">Tu khoa</label>
            <input
              type="text"
              className="form-control"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Nhap ten, email, so dien thoai"
            />
          </div>
          <div className="col-md-3 col-lg-2">
            <label className="form-label">Loc vai tro</label>
            <select
              className="form-select"
              value={filters.role}
              onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value as RoleFilter }))}
            >
              <option value="ALL">Tat ca</option>
              <option value="driver">Tai xe</option>
              <option value="company">Quan tri vien</option>
            </select>
          </div>
          <div className="col-md-3 col-lg-2">
            <label className="form-label">Loc trang thai</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as StatusFilter }))}
            >
              <option value="ALL">Tat ca</option>
              <option value="ACTIVE">Hoat dong</option>
              <option value="INACTIVE">Tam dung</option>
              <option value="SUSPENDED">Khoa</option>
            </select>
          </div>
          <div className="col-md-12 col-lg-4 text-end">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Xoa bo loc
            </button>
          </div>
        </div>
      </div>

      <div className="card p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="text-xl mb-0">Danh sach nhan vien</h2>
          <span className="text-muted small">
            {filteredStaff.length} / {staff.length} nhan vien
          </span>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Ho ten</th>
                <th>Email</th>
                <th>So dien thoai</th>
                <th>Vai tro</th>
                <th>Trang thai</th>
                <th>GPLX</th>
                <th>Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.email}</td>
                  <td>{entry.phone}</td>
                  <td>{entry.role === 'driver' ? 'Tai xe' : 'Quan tri'}</td>
                  <td>
                    <span
                      className={`badge bg-${
                        entry.status === 'ACTIVE' ? 'success' : entry.status === 'INACTIVE' ? 'secondary' : 'danger'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td>{entry.driverProfile?.licenseNumber || '-'}</td>
                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => startEdit(entry)}>
                        Sua
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        type="button"
                        onClick={() => toggleStatus(entry)}
                      >
                        {entry.status === 'ACTIVE' ? 'Tam dung' : 'Kich hoat'}
                      </button>
                      <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => handleDelete(entry.id)}>
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredStaff.length && !loading && (
            <div className="text-center py-4 text-muted">Chua co nhan vien nao.</div>
          )}
          {loading && (
            <div className="text-center py-4 text-muted">Dang tai...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageStaff;
