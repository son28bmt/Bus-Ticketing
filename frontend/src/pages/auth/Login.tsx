import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserStore } from '../../store/user';
import ROLES from '../../constants/roles';
import '../../style/login.css';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const { login, isLoading, error, clearError } = useUserStore();
  const navigate = useNavigate();

  // ⭐ Debug mount/unmount
  useEffect(() => {
    console.log('🔄 Login component mounted');
    
    return () => {
      console.log('🔄 Login component unmounted');
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log('🔄 Form submitted - preventing default');
    e.preventDefault(); // ⭐ QUAN TRỌNG
    e.stopPropagation(); // ⭐ QUAN TRỌNG
    
    if (!formData.email || !formData.password) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('🔄 Starting login process...');
    
    try {
      await login(formData.email, formData.password);
      
      const user = useUserStore.getState().user;
      console.log('✅ Login successful, redirecting...', user);
      
      if (user?.role === ROLES.ADMIN) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      // ⭐ KHÔNG làm gì thêm - error sẽ hiển thị từ store
      // ⭐ KHÔNG navigate, KHÔNG reload
    }
  };

  const fillDemoAccount = (type: 'admin' | 'user') => {
    console.log('🔄 Filling demo account:', type);
    
    if (type === 'admin') {
      setFormData({
        email: 'admin@shanbus.com',
        password: 'admin123'
      });
    } else {
      setFormData({
        email: 'user@example.com',
        password: 'user123'
      });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Đăng nhập</h1>
          <p>Chào mừng bạn quay trở lại</p>
        </div>

        <div className="demo-accounts">
          <p>Tài khoản demo:</p>
          <div className="demo-buttons">
            <button 
              type="button" // ⭐ QUAN TRỌNG
              className="demo-btn admin"
              onClick={() => fillDemoAccount('admin')}
            >
              Admin
            </button>
            <button 
              type="button" // ⭐ QUAN TRỌNG
              className="demo-btn user"
              onClick={() => fillDemoAccount('user')}
            >
              User
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập email của bạn"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading || !formData.email || !formData.password}
          >
            {isLoading ? (
              <span className="loading">
                <span className="spinner"></span>
                Đang đăng nhập...
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Chưa có tài khoản? {' '}
            <Link to="/register" className="register-link">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
