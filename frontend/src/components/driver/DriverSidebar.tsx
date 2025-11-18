import { NavLink } from 'react-router-dom';
import '../../style/driver.css';

const DriverSidebar = () => (
  <aside className="driver-sidebar">
    <h2>ShanBus Driver</h2>
    <nav className="driver-nav">
      <NavLink
        to="/driver/trips"
        className={({ isActive }) => (isActive ? 'active' : undefined)}
      >
        Chuyen xe cua toi
      </NavLink>
    </nav>
  </aside>
);

export default DriverSidebar;
