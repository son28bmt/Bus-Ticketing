import { useEffect, useState } from 'react';
import { companyAPI, type CompanyProfile } from '../../services/company';

const initialState: CompanyProfile = {
  id: 0,
  name: '',
  code: '',
  phone: '',
  email: '',
  address: '',
  description: '',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankCode: ''
};

export default function CompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await companyAPI.getProfile();
        if (response?.success && response.data) {
          setProfile({
            ...initialState,
            ...response.data
          });
        } else {
          setError(response?.message || 'Không thể tải thông tin nhà xe');
        }
      } catch (err) {
        console.error('[companyProfile] load error', err);
        setError('Không thể tải thông tin nhà xe');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
        description: profile.description,
        bankName: profile.bankName,
        bankAccountName: profile.bankAccountName,
        bankAccountNumber: profile.bankAccountNumber,
        bankCode: profile.bankCode
      };
      const response = await companyAPI.updateProfile(payload);
      if (response?.success && response.data) {
        setProfile((prev) => ({ ...prev, ...response.data }));
        setMessage('Đã cập nhật thông tin nhà xe');
      } else {
        setError(response?.message || 'Không thể cập nhật thông tin');
      }
    } catch (err) {
      console.error('[companyProfile] update error', err);
      setError('Không thể cập nhật thông tin nhà xe');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-3">Đang tải thông tin nhà xe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="mb-4">
        <h1>Thông tin nhà xe</h1>
        <p className="text-muted">Cập nhật thông tin liên hệ và tài khoản ngân hàng.</p>
      </div>

      <form className="card p-4" onSubmit={handleSubmit}>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-4">
          <div className="col-12 col-md-6">
            <label className="form-label">Tên nhà xe</label>
            <input
              type="text"
              className="form-control"
              value={profile.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Mã nhà xe</label>
            <input type="text" className="form-control" value={profile.code} disabled />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Số điện thoại</label>
            <input
              type="tel"
              className="form-control"
              value={profile.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={profile.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Địa chỉ</label>
            <input
              type="text"
              className="form-control"
              value={profile.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Mô tả</label>
            <textarea
              className="form-control"
              rows={3}
              value={profile.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>
        </div>

        <hr className="my-4" />
        <h4>Thông tin ngân hàng</h4>
        <div className="row g-4">
          <div className="col-12 col-md-6">
            <label className="form-label">Tên ngân hàng</label>
            <input
              type="text"
              className="form-control"
              value={profile.bankName || ''}
              onChange={(e) => handleChange('bankName', e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Mã ngân hàng (VietQR)</label>
            <input
              type="text"
              className="form-control"
              value={profile.bankCode || ''}
              onChange={(e) => handleChange('bankCode', e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Chủ tài khoản</label>
            <input
              type="text"
              className="form-control"
              value={profile.bankAccountName || ''}
              onChange={(e) => handleChange('bankAccountName', e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Số tài khoản</label>
            <input
              type="text"
              className="form-control"
              value={profile.bankAccountNumber || ''}
              onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 d-flex justify-content-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}
