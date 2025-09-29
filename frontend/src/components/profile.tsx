import { useState } from "react";
import { useUserStore } from "../store/user";
import "../style/_profile.css";

export default function Profile() {
  const { user } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const handleSave = () => {
    console.log("Saving user data:", formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Thông tin tài khoản</h2>
        <div className="profile-avatar-large">👤</div>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="card-header">
            <h3>Thông tin cá nhân</h3>
            <button 
              className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
            >
              {isEditing ? 'Hủy' : 'Chỉnh sửa'}
            </button>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label>Họ và tên</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-control"
                />
              ) : (
                <p className="form-value">{user?.name}</p>
              )}
            </div>

            <div className="form-group">
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="form-control"
                />
              ) : (
                <p className="form-value">{user?.email}</p>
              )}
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="form-control"
                  placeholder="Nhập số điện thoại"
                />
              ) : (
                <p className="form-value">{formData.phone || "Chưa cập nhật"}</p>
              )}
            </div>

            <div className="form-group">
              <label>Vai trò</label>
              <p className="form-value">
                <span className={`role-badge ${user?.role.toLowerCase()}`}>
                  {user?.role === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
                </span>
              </p>
            </div>

            {isEditing && (
              <div className="form-actions">
                <button className="btn btn-success" onClick={handleSave}>
                  Lưu thay đổi
                </button>
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-card">
          <div className="card-header">
            <h3>Bảo mật</h3>
          </div>
          <div className="card-body">
            <button className="btn btn-outline-primary">
              🔒 Đổi mật khẩu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}