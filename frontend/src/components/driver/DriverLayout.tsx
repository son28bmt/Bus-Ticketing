import { Outlet } from 'react-router-dom';
import DriverHeader from './DriverHeader';
import DriverSidebar from './DriverSidebar';
import '../../style/driver.css';

const DriverLayout = () => (
  <div className="driver-layout">
    <DriverSidebar />
    <div className="driver-content">
      <DriverHeader />
      <main className="driver-main">
        <Outlet />
      </main>
    </div>
  </div>
);

export default DriverLayout;
