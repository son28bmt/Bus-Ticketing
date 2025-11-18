import ROLES from '../../constants/roles';
import AdminDashboard from './AdminDashboard';
import CompanyDashboard from '../company/CompanyDashboard';
import { useUserStore } from '../../store/user';

export default function Dashboard() {
  const user = useUserStore(state => state.user);

  if (user?.role === ROLES.COMPANY) {
    return <CompanyDashboard />;
  }

  return <AdminDashboard />;
}

