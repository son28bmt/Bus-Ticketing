import { Outlet } from 'react-router-dom';
import { AdminHeader, AdminSidebar } from '../components/admin';
import '../style/dashboard.css';

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <AdminHeader />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
