import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './style/AdminSidebar.css';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  path: string;
  exact?: boolean; // ✅ Thêm optional property exact
  submenu?: MenuItem[];
}

export default function AdminSidebar() {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['dashboard']);

  const menuItems: MenuItem[] = [
    { 
      path: '/admin', 
      id: 'overview', // ✅ Đổi id để tránh trùng lặp
      icon: '📊', 
      title: 'Tổng quan', 
      exact: true 
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '�', // ✅ Đổi icon để phân biệt
      path: '/admin/dashboard'
    },
    {
      id: 'trips',
      title: 'Quản lý chuyến xe',
      icon: '🚌',
      path: '/admin/trips',
      submenu: [
        { id: 'all-trips', title: 'Tất cả chuyến', icon: '📋', path: '/admin/trips' },
        { id: 'add-trip', title: 'Thêm chuyến mới', icon: '➕', path: '/admin/trips/create' }
      ]
    },
    {
      id: 'buses',
      title: 'Quản lý xe',
      icon: '🚐',
      path: '/admin/buses',
      submenu: [
        { id: 'all-buses', title: 'Tất cả xe', icon: '🚐', path: '/admin/buses' },
        { id: 'add-bus', title: 'Thêm xe mới', icon: '➕', path: '/admin/buses/create' }
      ]
    },
    {
      id: 'bookings',
      title: 'Đặt vé & Khách hàng',
      icon: '🎫',
      path: '/admin/bookings'
    },
    {
      id: 'revenue',
      title: 'Doanh thu',
      icon: '💰',
      path: '/admin/revenue'
    },
    {
      id: 'users',
      title: 'Quản lý tài khoản',
      icon: '👥',
      path: '/admin/users'
    },
    {
      id: 'news',
      title: 'Quản lý tin tức',
      icon: '📰',
      path: '/admin/news'
    },
    { 
      path: '/admin/reports', 
      id: 'reports', 
      icon: '📋', // ✅ Đổi icon để phân biệt với dashboard
      title: 'Báo cáo' 
    }
  ];

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isActiveMenu = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isMenuExpanded = (menuId: string) => expandedMenus.includes(menuId);

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <h3>🚌 ShanBus Admin</h3>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <div key={item.id} className="nav-item">
            {item.submenu ? (
              <>
                <button 
                  className={`nav-link expandable ${isMenuExpanded(item.id) ? 'expanded' : ''}`}
                  onClick={() => toggleMenu(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-title">{item.title}</span>
                  <span className="expand-arrow">
                    {isMenuExpanded(item.id) ? '▼' : '▶'}
                  </span>
                </button>
                
                {isMenuExpanded(item.id) && (
                  <div className="submenu">
                    {item.submenu.map(subItem => (
                      <Link
                        key={subItem.id}
                        to={subItem.path}
                        className={`nav-link submenu-link ${isActiveMenu(subItem.path, subItem.exact) ? 'active' : ''}`}
                      >
                        <span className="nav-icon">{subItem.icon}</span>
                        <span className="nav-title">{subItem.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                to={item.path}
                className={`nav-link ${isActiveMenu(item.path, item.exact) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-title">{item.title}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}