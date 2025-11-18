// src/pages/Profile.tsx
import { useRef, useState } from "react";
import { useUserStore } from '../../store/user';
import ROLES from '../../constants/roles';
import "../../style/_profile.css";

export default function Profile() {
  const { user, updateProfile, changePassword, setAvatar } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSave = async () => {
    setMessage(null);
    setError(null);
    try {
      setSaving(true);
      await updateProfile({ name: formData.name, phone: formData.phone });
      setIsEditing(false);
      setMessage("Đã lưu thông tin cá nhân");
    } catch {
      setError("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setIsEditing(false);
  };

  const getRoleConfig = () => {
    if (!user?.role) return { text: "Hành khách", variant: "success" };
    if (user.role === ROLES.ADMIN) return { text: "Quản trị viên", variant: "danger" };
    if (user.role === ROLES.COMPANY) return { text: "Nhà xe", variant: "warning" };
    return { text: "Hành khách", variant: "success" };
  };

  const role = getRoleConfig();

  const onChooseAvatar = () => fileInputRef.current?.click();

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB
      setError('Ảnh quá lớn. Giới hạn 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
      setMessage('Ảnh đại diện đã được cập nhật (lưu trên thiết bị)');
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      setError('Vui lòng nhập đủ thông tin');
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setError('Mật khẩu mới phải tối thiểu 6 ký tự');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      setSaving(true);
      await changePassword(pwdForm.currentPassword, pwdForm.newPassword);
      setMessage('Đổi mật khẩu thành công');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwd(false);
    } catch {
      setError('Đổi mật khẩu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-vh-100 ${darkMode ? 'bg-dark text-light' : 'bg-light'}`}>
      {/* Dark Mode Toggle */}
      <button
        className="btn btn-outline-secondary position-fixed top-0 end-0 m-3 z-3"
        onClick={() => setDarkMode(!darkMode)}
      >
        {darkMode ? 'Light' : 'Dark'}
      </button>

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">

            {/* Header Card */}
            <div className={`card shadow-lg border-0 mb-4 ${darkMode ? 'bg-dark text-light border-secondary' : ''}`}>
              <div className="card-body text-center p-5 profile-header">
                <div className="position-relative d-inline-block mb-3 avatar-wrapper">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="avatar-img rounded-circle" width={100} height={100} />
                  ) : (
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold avatar-initial">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <button type="button" className="btn btn-sm btn-light rounded-circle position-absolute bottom-0 end-0 shadow-sm upload-btn" onClick={onChooseAvatar}>
                    Tải Lên
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={onAvatarChange} />
                </div>
                <h3 className="mb-1">{user?.name || "Người dùng"}</h3>
                <p className="text-muted">{user?.email}</p>
                {message && <div className="alert alert-success py-2 small mt-3 mb-0">{message}</div>}
                {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
              </div>
            </div>

            {/* Thông tin cá nhân */}
            <div className={`card shadow-sm mb-4 ${darkMode ? 'bg-dark text-light border-secondary' : ''}`}>
              <div className="card-header d-flex justify-content-between align-items-center bg-transparent">
                <h5 className="mb-0">Thông tin cá nhân</h5>
                <button
                  className={`btn btn-sm ${isEditing ? 'btn-outline-secondary' : 'btn-primary'}`}
                  onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                >
                  {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                </button>
              </div>
              <div className="card-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Họ và tên</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    ) : (
                      <p className="form-control-plaintext">{user?.name || "Chưa cập nhật"}</p>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    ) : (
                      <p className="form-control-plaintext">{user?.email}</p>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Số điện thoại</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Nhập số điện thoại"
                      />
                    ) : (
                      <p className="form-control-plaintext">{formData.phone || "Chưa cập nhật"}</p>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Vai trò</label>
                    <span className={`badge bg-${role.variant} fs-6`}>
                      {role.text}
                    </span>
                  </div>

                  {isEditing && (
                    <div className="d-flex gap-2 form-actions">
                      <button type="button" className="btn btn-success flex-fill" onClick={handleSave} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                      <button type="button" className="btn btn-secondary flex-fill" onClick={handleCancel} disabled={saving}>
                        Hủy
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Bảo mật */}
            <div className={`card shadow-sm ${darkMode ? 'bg-dark text-light border-secondary' : ''}`}>
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Bảo mật</h5>
                <button style = {{ color:"#f0f0f0ff" }} className="btn btn-outline-primary" onClick={() => setShowPwd((s) => !s)}>
                  {showPwd ? 'Đóng' : 'Đổi mật khẩu'}
                </button>
              </div>
              {showPwd && (
                <div className="card-body">
                  <form onSubmit={handleChangePassword} className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        className="form-control"
                        value={pwdForm.currentPassword}
                        onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Mật khẩu mới</label>
                      <input
                        type="password"
                        className="form-control"
                        value={pwdForm.newPassword}
                        onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        className="form-control"
                        value={pwdForm.confirmPassword}
                        onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                      />
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Đang đổi...' : 'Đổi mật khẩu'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowPwd(false)} disabled={saving}>
                        Hủy
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
