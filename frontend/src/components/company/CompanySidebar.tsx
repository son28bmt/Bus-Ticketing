import { NavLink, useLocation } from 'react-router-dom';

type MenuItem = {
  id: string;
  title: string;
  path: string;
};

const items: MenuItem[] = [
  { id: 'dashboard', title: 'Tổng quan',  path: '/company/dashboard' },
  { id: 'trips', title: 'Chuyến xe',  path: '/company/trips' },
  { id: 'buses', title: 'Xe',  path: '/company/buses' },
  { id: 'bookings', title: 'Đặt vé',  path: '/company/bookings' },
  { id: 'news', title: 'Tin tức',  path: '/company/news' },
  { id: 'vouchers', title: 'Voucher', path: '/company/vouchers' },
  { id: 'revenue', title: 'Doanh thu',  path: '/company/revenue' },
  { id: 'reports', title: 'Báo cáo',  path: '/company/reports' },
  { id: 'home', title: 'Trang Chủ',  path: '/' },
];

const CompanySidebar = () => {
  const { pathname } = useLocation();
  return (
    <aside className="company-sidebar">
      <nav>
        <ul style={{ textAlign:"end" }}>
          {items.map((it) => (
            <li key={it.id}>
              <NavLink
                to={it.path}
                className={({ isActive }) => `nav-link${isActive || pathname === it.path ? ' active' : ''}`}
                end
              >
                <span>{it.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default CompanySidebar;
