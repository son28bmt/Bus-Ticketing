import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './style/AdminSidebar.css';

interface MenuItem {
  id: string;
  title: string;
  // icon: string;
  path: string;
  exact?: boolean;
  submenu?: MenuItem[];
}

export default function AdminSidebar() {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    // {
    //   id: 'overview',
    //   title: 'Tổng quan',
    //   // icon: '??',
    //   path: '/admin',
    //   exact: true,
    // },
    {
      id: 'dashboard',
      title: 'Dashboard',
      // icon: '?',
      path: '/admin/dashboard',
    },
    {
      id: 'users',
      title: 'Quản Lý Người Dùng',
      // icon: '?',
      path: '/admin/users',
    },
    {
      id: 'companies',
      title: 'Quản Lý Nhà Xe',
      // icon: '??',
      path: '/admin/companies',
    },
    {
      id: 'buses',
      title: 'Quản Lý Xe',
      // icon: '??',
      path: '/admin/buses',
    },
    {
      id: 'trips',
      title: 'Quản Lý Chuyến Xe',
      // icon: '?',
      path: '/admin/trips',
      // submenu: [
      //   {
      //     id: 'all-trips',
      //     title: 'Tất cả chuyến',
      //     // icon: '??',
      //     path: '/admin/trips',
      //   },
      // ],
    },
    {
      id: 'bookings',
      title: 'Quản Lý Đặt Vé',
      // icon: '??',
      path: '/admin/bookings',
    },
    {
      id: 'news',
      title: 'Tin tức',
      // icon: '??',
      path: '/admin/news',
    },
    {
      id: 'vouchers',
      title: 'Voucher',
      path: '/admin/vouchers',
    },
    {
      id: 'reports',
      title: 'Báo cáo',
      // icon: '??',
      path: '/admin/reports',
    },
  ];

  // Auto-expand sections when current path matches their base path
  useMemo(() => {
    const autoExpanded = menuItems
      .filter((item) => item.submenu && location.pathname.startsWith(item.path))
      .map((item) => item.id);
    setExpandedMenus((prev) => Array.from(new Set([...prev, ...autoExpanded])));
  }, [location.pathname]);

  const toggleExpand = (id: string) => {
    setExpandedMenus((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h3>Quản trị</h3>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item" style={{ padding: "12px 16px" }}>
              {item.submenu ? (
                <>
                  <button
                    style={{ padding: "12px 16px", width: '300px', gap: '12px' }}
                    type="button"
                    className={`nav-link expandable ${expandedMenus.includes(item.id) ? 'expanded' : ''}`}
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={expandedMenus.includes(item.id)}
                  >
                    {/* <span className="nav-icon">{item.icon}</span> */}
                    <span className="nav-title">{item.title}</span>
                    <span className="expand-arrow">▼</span>
                  </button>
                  <ul className="submenu" style={{ display: expandedMenus.includes(item.id) ? 'flex' : undefined }}>
                    {item.submenu.map((sub) => (
                      <li key={sub.id} className="nav-item">
                        <NavLink to={sub.path} className={({ isActive }) => `submenu-link ${isActive ? 'active' : ''}`}>
                          {/* <span className="nav-icon">{sub.icon}</span> */}
                          <span className="nav-title">{sub.title}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <NavLink to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                  {/* <span className="nav-icon">{item.icon}</span> */}
                  <span className="nav-title">{item.title}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}


