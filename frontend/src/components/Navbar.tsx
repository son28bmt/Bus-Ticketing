import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUserStore } from "../store/user";
import "../style/nav.css";

export default function Navbar() {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown && !(event.target as Element)?.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserDropdown]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setShowUserDropdown(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={`modern-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-brand">
          <Link to="/" className="brand-link">
            <div className="logo-container">
              <img src="/logo_shanbus.png" alt="ShanBus" className="brand-logo" height={100} width={100}/>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Menu */}
        <div className="navbar-menu desktop-menu">
          <ul className="nav-links">
            <li className="nav-item">
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
              >
                {/* <span className="nav-icon">🏠</span> */}
                <span className="nav-text">Trang chủ</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/search" 
                className={`nav-link ${isActive('/search') ? 'active' : ''}`}
              >
                {/* <span className="nav-icon">🔍</span> */}
                <span className="nav-text">Tìm chuyến</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/about" 
                className={`nav-link ${isActive('/about') ? 'active' : ''}`}
              >
                {/* <span className="nav-icon">ℹ️</span> */}
                <span className="nav-text">Giới thiệu</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/news" 
                className={`nav-link ${isActive('/news') ? 'active' : ''}`}
              >
                {/* <span className="nav-icon">📰</span> */}
                <span className="nav-text">Tin tức</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/contact" 
                className={`nav-link ${isActive('/contact') ? 'active' : ''}`}
              >
                {/* <span className="nav-icon">📞</span> */}
                <span className="nav-text">Liên hệ</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* User Section */}
        <div className="navbar-user">
          {user ? (
            <div className="user-dropdown">
              <button
                className="user-button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <div className="user-avatar">
                  <div className="avatar-circle">
                    {user.role === "ADMIN" ? "👨‍💼" : "👤"}
                  </div>
                </div>
                <div className="user-info">
                  <span className="user-name">Xin chào, {user.name}</span>
                  <span className="user-role">
                    {user.role === "ADMIN" ? "Quản trị viên" : "Hành khách"}
                  </span>
                </div>
                <div className="dropdown-arrow">
                  <span className={`arrow ${showUserDropdown ? 'up' : 'down'}`}>▼</span>
                </div>
              </button>

              {showUserDropdown && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <div className="user-details">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  {user.role === "ADMIN" ? (
                    <div className="dropdown-section">
                      <span className="section-title">Quản trị</span>
                      <Link to="/admin/dashboard" className="dropdown-item">
                        <span className="item-icon">📊</span>
                        <span className="item-text">Dashboard</span>
                      </Link>
                      <Link to="/admin/manage-trips" className="dropdown-item">
                        <span className="item-icon">🚌</span>
                        <span className="item-text">Quản lý chuyến</span>
                      </Link>
                      <Link to="/admin/manage-users" className="dropdown-item">
                        <span className="item-icon">👥</span>
                        <span className="item-text">Quản lý người dùng</span>
                      </Link>
                      <Link to="/admin/reports" className="dropdown-item">
                        <span className="item-icon">📈</span>
                        <span className="item-text">Báo cáo</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="dropdown-section">
                      <span className="section-title">Tài khoản</span>
                      <Link to="/my-tickets" className="dropdown-item">
                        <span className="item-icon">🎫</span>
                        <span className="item-text">Vé của tôi</span>
                      </Link>
                      <Link to="/profile" className="dropdown-item">
                        <span className="item-icon">👤</span>
                        <span className="item-text">Hồ sơ cá nhân</span>
                      </Link>
                      <Link to="/settings" className="dropdown-item">
                        <span className="item-icon">⚙️</span>
                        <span className="item-text">Cài đặt</span>
                      </Link>
                    </div>
                  )}

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    <span className="item-icon">🚪</span>
                    <span className="item-text">Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">
                <span className="btn-icon">🔐</span>
                <span className="btn-text">Đăng nhập</span>
              </Link>
              <Link to="/register" className="btn-register">
                <span className="btn-icon">📝</span>
                <span className="btn-text">Đăng ký</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-menu-btn">
          <button 
            className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-nav-links">
            <Link 
              to="/" 
              className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {/* <span className="nav-icon">🏠</span> */}
              <span className="nav-text">Trang chủ</span>
            </Link>
            <Link 
              to="/search" 
              className={`mobile-nav-link ${isActive('/search') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {/* <span className="nav-icon">🔍</span> */}
              <span className="nav-text">Tìm chuyến</span>
            </Link>
            <Link 
              to="/about" 
              className={`mobile-nav-link ${isActive('/about') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {/* <span className="nav-icon">ℹ️</span> */}
              <span className="nav-text">Giới thiệu</span>
            </Link>
            <Link 
              to="/news" 
              className={`mobile-nav-link ${isActive('/news') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {/* <span className="nav-icon">📰</span> */}
              <span className="nav-text">Tin tức</span>
            </Link>
            <Link 
              to="/contact" 
              className={`mobile-nav-link ${isActive('/contact') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {/* <span className="nav-icon">📞</span> */}
              <span className="nav-text">Liên hệ</span>
            </Link>
          </div>

          {/* Mobile Auth Section */}
          {!user && (
            <div className="mobile-auth">
              <Link to="/login" className="mobile-auth-btn login">
                <span className="btn-icon">🔐</span>
                <span className="btn-text">Đăng nhập</span>
              </Link>
              <Link to="/register" className="mobile-auth-btn register">
                <span className="btn-icon">📝</span>
                <span className="btn-text">Đăng ký</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}