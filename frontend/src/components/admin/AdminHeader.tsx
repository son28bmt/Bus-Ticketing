import { useUserStore } from '../../store/user';
import { useNavigate } from 'react-router-dom';
import './Style/AdminHeader.css';

export default function AdminHeader() {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="admin-header">
      <div className="header-content">
        <h1>Bảng điều khiển</h1>
        
        <div className="header-actions">
          <div className="user-info">
            <span className="user-avatar">👨‍💼</span>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">Quản trị viên</span>
            </div>
          </div>
          
          <button onClick={handleLogout} className="logout-btn">
            🚪 Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}