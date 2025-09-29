import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
// import Footer from '../Footer';
import './style/AdminLayout.css';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      {/* ✅ Sidebar cố định */}
      <AdminSidebar />
      
      {/* ✅ Main content area */}
      <div className="admin-content">
        {/* ✅ Admin Header */}
        <AdminHeader />
        
        {/* ✅ Main Content - Flex 1 */}
        <main className="admin-main">
          <Outlet />
        </main>
        
        {/* ✅ Footer */}
        {/* <Footer /> */}
      </div>
    </div>
  );
}