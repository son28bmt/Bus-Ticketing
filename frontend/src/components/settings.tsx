import { useState } from "react";
import "../style/_setting.css";

export default function Settings() {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    privacy: {
      profilePublic: false,
      showEmail: false,
    },
    preferences: {
      language: "vi",
      theme: "light",
      autoSave: true,
    }
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }));
  };

  const handlePreferenceChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Cài đặt</h2>
        <p>Quản lý các tùy chọn và cài đặt của bạn</p>
      </div>

      <div className="settings-content">
        {/* Thông báo */}
        <div className="settings-card">
          <div className="card-header">
            <h3>🔔 Thông báo</h3>
            <p>Chọn cách bạn muốn nhận thông báo</p>
          </div>
          <div className="card-body">
            <div className="setting-item">
              <div className="setting-info">
                <label>Thông báo Email</label>
                <small>Nhận thông báo về đơn hàng qua email</small>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.email}
                    onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Thông báo SMS</label>
                <small>Nhận thông báo về đơn hàng qua SMS</small>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.sms}
                    onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Thông báo đẩy</label>
                <small>Nhận thông báo đẩy từ trình duyệt</small>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push}
                    onChange={(e) => handleNotificationChange('push', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Quyền riêng tư */}
        <div className="settings-card">
          <div className="card-header">
            <h3>🔒 Quyền riêng tư</h3>
            <p>Kiểm soát thông tin cá nhân của bạn</p>
          </div>
          <div className="card-body">
            <div className="setting-item">
              <div className="setting-info">
                <label>Hồ sơ công khai</label>
                <small>Cho phép người khác xem hồ sơ của bạn</small>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.privacy.profilePublic}
                    onChange={(e) => handlePrivacyChange('profilePublic', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Hiển thị Email</label>
                <small>Cho phép hiển thị email trong hồ sơ công khai</small>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.privacy.showEmail}
                    onChange={(e) => handlePrivacyChange('showEmail', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Tùy chọn */}
        <div className="settings-card">
          <div className="card-header">
            <h3>⚙️ Tùy chọn</h3>
            <p>Cài đặt chung cho ứng dụng</p>
          </div>
          <div className="card-body">
            <div className="setting-item">
              <div className="setting-info">
                <label>Ngôn ngữ</label>
                <small>Chọn ngôn ngữ hiển thị</small>
              </div>
              <div className="setting-control">
                <select
                  value={settings.preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  className="form-select"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Giao diện</label>
                <small>Chọn chủ đề hiển thị</small>
              </div>
              <div className="setting-control">
                <select
                  value={settings.preferences.theme}
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                  className="form-select"
                >
                  <option value="light">Sáng</option>
                  <option value="dark">Tối</option>
                  <option value="auto">Tự động</option>
                </select>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Tự động lưu</label>
                <small>Tự động lưu các thay đổi</small>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.preferences.autoSave}
                    onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Các hành động khác */}
        <div className="settings-card">
          <div className="card-header">
            <h3>🗑️ Quản lý tài khoản</h3>
            <p>Các hành động liên quan đến tài khoản</p>
          </div>
          <div className="card-body">
            <button className="btn btn-outline-danger">
              Xóa tài khoản
            </button>
            <p className="text-muted">Hành động này không thể hoàn tác</p>
          </div>
        </div>
      </div>
    </div>
  );
}