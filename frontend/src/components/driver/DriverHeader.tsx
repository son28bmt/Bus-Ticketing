import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/user';
import '../../style/driver.css';

const DriverHeader = () => {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="driver-header">
      <div>
        <h1>Bang dieu khien tai xe</h1>
        <div className="driver-meta">
          <span>{user?.name}</span>
          {user?.driverProfile?.licenseNumber && (
            <span>GPLX: {user.driverProfile.licenseNumber}</span>
          )}
        </div>
      </div>
      <button type="button" onClick={handleLogout}>
        Dang xuat
      </button>
    </header>
  );
};

export default DriverHeader;
