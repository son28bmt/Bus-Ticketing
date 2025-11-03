import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import '../style/main.css';

type UserLayoutProps = {
  children?: React.ReactNode;
};

const UserLayout = ({ children }: UserLayoutProps) => {
  return (
    <div className="user-layout">
      <Navbar />
      <main className="user-content">
        {children ?? <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

export default UserLayout;
