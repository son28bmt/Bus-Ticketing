import { Outlet } from 'react-router-dom';
import { CompanyHeader, CompanySidebar } from '../components/company';
import '../style/dashboard.css';

const CompanyLayout = () => {
  return (
    <div className="company-layout">
      <CompanyHeader />
      <div className="company-layout__body">
        <CompanySidebar />
        <main className="company-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CompanyLayout;
