import { NavLink, useLocation } from 'react-router-dom';

type MenuItem = {
  id: string;
  title: string;
  path: string;
};

const items: MenuItem[] = [
  { id: 'dashboard', title: 'Tổng quan', path: '/company/dashboard' },
  { id: 'trips', title: 'Chuyến xe', path: '/company/trips' },
  { id: 'buses', title: 'Xe', path: '/company/buses' },
  { id: 'bookings', title: 'Đặt vé', path: '/company/bookings' },
  { id: 'news', title: 'Tin tức', path: '/company/news' },
  { id: 'vouchers', title: 'Voucher', path: '/company/vouchers' },
  { id: 'staff', title: 'Nhân viên', path: '/company/staff' },
  { id: 'revenue', title: 'Doanh thu', path: '/company/revenue' },
  { id: 'reports', title: 'Báo cáo', path: '/company/reports' },
  { id: 'profile', title: 'Thông tin nhà xe', path: '/company/profile' },
  { id: 'home', title: 'Trang chủ', path: '/' }
];

const CompanySidebar = () => {
  const { pathname } = useLocation();
  return (
    <aside className="company-sidebar">
      <nav>
        <ul style={{ textAlign: 'end' }}>
          {items.map(item => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-link${isActive || pathname === item.path ? ' active' : ''}`}
                end
              >
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default CompanySidebar;
