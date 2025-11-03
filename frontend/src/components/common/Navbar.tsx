import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useUserStore } from '../../store/user';
import ROLES from '../../constants/roles';
import '../../style/nav.css';

const isCompanyRole = (role?: string | null) => role === ROLES.COMPANY;

export default function Navbar() {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const handleDropdownLinkClick = () => {
    setShowUserDropdown(false);
  };

  return (
    <nav className={`modern-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="brand-link">
            <div className="logo-container">
              <img
                src="/logo_shanbus.png"
                alt="ShanBus"
                className="brand-logo"
                height={100}
                width={100}
              />
            </div>
          </Link>
        </div>

        <div className="navbar-menu desktop-menu">
          <ul className="nav-links">
            <li className="nav-item">
              <Link to="/" className={`nav-link_home ${isActive('/') ? 'active' : ''}`}>
                <span className="nav-text">Trang chủ</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to="/search"
                className={`nav-link_home ${isActive('/search') ? 'active' : ''}`}
              >
                <span className="nav-text">Tìm chuyến</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to="/about"
                className={`nav-link_home ${isActive('/about') ? 'active' : ''}`}
              >
                <span className="nav-text">Giới thiệu</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to="/news"
                className={`nav-link_home ${isActive('/news') ? 'active' : ''}`}
              >
                <span className="nav-text">Tin tức</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to="/contact"
                className={`nav-link_home ${isActive('/contact') ? 'active' : ''}`}
              >
                <span className="nav-text">Liên hệ</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="navbar-user">
          {user ? (
            <div className="user-dropdown" ref={dropdownRef}>
              <button
                className="user-button"
                onClick={() => setShowUserDropdown((prev) => !prev)}
              >
                <div className="user-avatar">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || user.email || 'User avatar'}
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-circle">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="user-info">
                  <span className="user-name">Xin chào, {user.name}</span>
                  <span className="user-role">
                    {user.role === ROLES.ADMIN
                      ? 'Quản trị viên'
                      : isCompanyRole(user.role)
                      ? 'Nhà xe'
                      : 'Hành khách'}
                  </span>
                </div>
                <div className="dropdown-arrow">
                  <span className={`arrow ${showUserDropdown ? 'up' : 'down'}`}>▼</span>
                </div>
              </button>

              {showUserDropdown && (
                <div className="dropdown-menu" style ={{ width: '250px' }}>
                  <div className="dropdown-header">
                    <div className="user-details">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {user.role === ROLES.ADMIN ? (
                    <div className="dropdown-section">
                      <span className="section-title">Quản trị</span>
                      <Link to="/admin/dashboard" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Dashboard</span>
                      </Link>
                      <Link to="/admin/trips" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Quản lý chuyến</span>
                      </Link>
                      <Link to="/admin/companies" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Quản lý nhà xe</span>
                      </Link>
                      <Link to="/admin/users" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Quản lý người dùng</span>
                      </Link>
                      <Link to="/admin/bookings" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Quản lý đặt vé</span>
                      </Link>
                      <Link to="/admin/news" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Tin tức</span>
                      </Link>
                      <Link to="/admin/vouchers" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Voucher</span>
                      </Link>
                      <Link to="/admin/reports" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Báo cáo</span>
                      </Link>
                    </div>
                  ) : isCompanyRole(user.role) ? (
                    <div className="dropdown-section">
                      <span className="section-title">Nhà xe</span>
                      <Link to="/company/dashboard" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Dashboard</span>
                      </Link>
                      <Link to="/company/trips" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Quản lý chuyến</span>
                      </Link>
                      <Link to="/company/buses" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Quản lý xe</span>
                      </Link>
                      <Link to="/company/bookings" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Đặt vé</span>
                      </Link>
                      <Link to="/company/revenue" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Doanh thu</span>
                      </Link>
                      <Link to="/company/news" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Tin tức</span>
                      </Link>
                      <Link to="/company/vouchers" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Voucher</span>
                      </Link>
                      <Link to="/company/reports" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Báo cáo</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="dropdown-section">
                      <span className="section-title">Tài khoản</span>
                      <Link to="/my-tickets" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Vé của tôi</span>
                      </Link>
                      <Link to="/my-vouchers" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Kho voucher</span>
                      </Link>
                      <Link to="/profile" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Hồ sơ cá nhân</span>
                      </Link>
                      <Link to="/settings" className="dropdown-item" onClick={handleDropdownLinkClick}>
                        <span className="item-text">Cài đặt</span>
                      </Link>
                    </div>
                  )}

                  <div className="dropdown-divider" />

                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    <span className="item-text">Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">
                <span className="btn-text">Đăng nhập</span>
              </Link>
              <Link to="/register" className="btn-register">
                <span className="btn-text">Đăng ký</span>
              </Link>
            </div>
          )}
        </div>

        <div className="mobile-menu-btn">
          <button
            className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-nav-links">
            <Link
              to="/"
              className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-text">Trang chủ</span>
            </Link>
            <Link
              to="/search"
              className={`mobile-nav-link ${isActive('/search') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-text">Tìm chuyến</span>
            </Link>
            <Link
              to="/about"
              className={`mobile-nav-link ${isActive('/about') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-text">Giới thiệu</span>
            </Link>
            <Link
              to="/news"
              className={`mobile-nav-link ${isActive('/news') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-text">Tin tức</span>
            </Link>
            <Link
              to="/contact"
              className={`mobile-nav-link ${isActive('/contact') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-text">Liên hệ</span>
            </Link>
          </div>

          {!user && (
            <div className="mobile-auth">
              <Link
                to="/login"
                className="mobile-auth-btn login"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="btn-text">Đăng nhập</span>
              </Link>
              <Link
                to="/register"
                className="mobile-auth-btn register"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="btn-text">Đăng ký</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

