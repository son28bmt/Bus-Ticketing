import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { adminAPI, type BusCompany } from '../../services/admin';
import { formatDate } from '../../utils/formatDate';
import '../../style/table.css';
import '../../style/admin-mobile.css';
import { toViStatus, statusVariant } from '../../utils/status';

interface CompanyFormState {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  isActive: boolean;
}

const initialForm: CompanyFormState = {
  name: '',
  code: '',
  email: '',
  phone: '',
  address: '',
  description: '',
  isActive: true
};

export default function ManageCompanies() {
  const [companies, setCompanies] = useState<BusCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyFormState>(initialForm);

  const canSubmit = useMemo(
    () => form.name.trim().length > 0 && form.code.trim().length > 0,
    [form.name, form.code]
  );

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAPI.getCompanies({ limit: 100 });
      if (res.success) {
        setCompanies(res.data || []);
      } else {
        setError('Không thể tải danh sách nhà xe');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách nhà xe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const name = target.name as keyof CompanyFormState as string;
    const value = target.value;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        description: form.description.trim() || undefined,
        isActive: form.isActive
      };

      const res = await adminAPI.createCompany(payload);
      if (res.success) {
        setSuccess('Tạo nhà xe thành công');
        setForm(initialForm);
        await loadCompanies();
      } else {
        setError(res.message || 'Tạo nhà xe thất bại');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tạo nhà xe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 admin-manage-trips">
      <h1 className="text-2xl fw-semibold mb-4">Quản lý nhà xe</h1>
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <form onSubmit={handleSubmit} className="card p-3 mb-5">
        <h2 className="text-xl mb-3">Tạo nhà xe mới</h2>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">
              Tên nhà xe <span className="text-danger">*</span>
            </label>
            <input
              className="form-control"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ví dụ: Nhà xe Thành Bưởi"
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              Mã (IN HOA) <span className="text-danger">*</span>
            </label>
            <input
              className="form-control"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="Ví dụ: THANHBUI"
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="contact@example.com"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Số điện thoại</label>
            <input
              className="form-control"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="09xxxxxxx"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Địa chỉ</label>
            <input
              className="form-control"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Địa chỉ trụ sở"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Mô tả</label>
            <textarea
              className="form-control"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Thông tin mô tả ngắn"
            />
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="company-active"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="company-active">
                Hoạt động
              </label>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <button className="btn btn-primary" disabled={loading || !canSubmit}>
            {loading ? 'Đang lưu...' : 'Tạo nhà xe'}
          </button>
        </div>
      </form>

      <div className="card p-3">
        <h2 className="text-xl mb-3">Danh sách nhà xe</h2>
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>Mã</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7}>Chưa có nhà xe nào</td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.id}</td>
                    <td>{company.name}</td>
                    <td>{company.code}</td>
                    <td>{company.email || '-'}</td>
                    <td>{company.phone || '-'}</td>
                    <td>
                      <span className={`badge bg-${statusVariant(company.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                        {toViStatus(company.isActive ? 'ACTIVE' : 'INACTIVE')}
                      </span>
                    </td>
                    <td>{company.createdAt ? formatDate(company.createdAt) : '-'}</td>
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
