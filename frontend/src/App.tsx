import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Home from './pages/Home';
import About from './pages/about';
import Contact from './pages/contact';
import News from './pages/news';
import NewsDetail from './pages/NewsDetail';
import Search from './pages/Search';
import TripDetail from './pages/TripDetail';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import VNPayReturn from './pages/VNPayReturn';
import MyTickets from './pages/MyTickets';
import Checkout from './pages/Checkout';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Components
import Profile from './components/profile';
import Settings from './components/settings';

// Admin pages
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageTrips from './pages/admin/ManageTrips';
import ManageBuses from './pages/admin/ManageBuses';
import ManageBookings from './pages/admin/ManageBookings';
import ManageNews from './pages/admin/ManageNews';
import Reports from './pages/admin/Reports';

import './index.css';

// Layout component for public pages
const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="app-container">
    <Navbar />
    <main className="main-content">
      {children}
    </main>
    <Footer />
  </div>
);

// ✅ Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode }, 
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <h1 style={{ color: '#e53e3e', marginBottom: '16px' }}>
            ⚠️ Có lỗi xảy ra
          </h1>
          <p style={{ color: '#4a5568', marginBottom: '24px', maxWidth: '600px' }}>
            Ứng dụng đã gặp sự cố không mong muốn. Vui lòng thử tải lại trang.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#4299e1',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🔄 Tải lại trang
          </button>
          {import.meta.env.MODE === 'development' && this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#718096' }}>
                Chi tiết lỗi (Development)
              </summary>
              <pre style={{ 
                background: '#1a202c', 
                color: '#e2e8f0', 
                padding: '16px', 
                borderRadius: '8px',
                fontSize: '12px',
                overflow: 'auto',
                maxWidth: '800px'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <PrivateRoute allowedRoles={['ADMIN']}>
              <AdminLayout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="trips" element={<ManageTrips />} />
            <Route path="bookings" element={<ManageBookings />} />
            <Route path="news" element={<ManageNews />} />
            <Route path="reports" element={<Reports />} />
            <Route path="trips/create" element={<div>Thêm chuyến mới</div>} />
            <Route path="buses" element={<ManageBuses />} />
            <Route path="buses/create" element={<ManageBuses />} />
            <Route path="revenue" element={<div>Báo cáo doanh thu</div>} />
          </Route>

          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
          <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
          <Route path="/news/:slug" element={<PublicLayout><NewsDetail /></PublicLayout>} />
          <Route path="/search" element={<PublicLayout><Search /></PublicLayout>} />
          <Route path="/trip/:id" element={<PublicLayout><TripDetail /></PublicLayout>} />

          {/* Auth Pages */}
          <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />

          {/* Protected Pages */}
          <Route path="/profile" element={
            <PublicLayout>
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            </PublicLayout>
          } />

          <Route path="/settings" element={
            <PublicLayout>
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            </PublicLayout>
          } />

          <Route path="/payment" element={
            <PublicLayout>
              <PrivateRoute>
                <Payment />
              </PrivateRoute>
            </PublicLayout>
          } />
          
          <Route path="/payment/success" element={
            <PublicLayout>
              <PrivateRoute>
                <PaymentSuccess />
              </PrivateRoute>
            </PublicLayout>
          } />
          
          <Route path="/payment/vnpay/return" element={
            <PublicLayout>
              <PrivateRoute>
                <VNPayReturn />
              </PrivateRoute>
            </PublicLayout>
          } />
          
          <Route path="/my-tickets" element={
            <PublicLayout>
              <PrivateRoute>
                <MyTickets />
              </PrivateRoute>
            </PublicLayout>
          } />
          
          <Route path="/checkout" element={
            <PublicLayout>
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            </PublicLayout>
          } />

          {/* 404 Page */}
          <Route path="*" element={
            <PublicLayout>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center'
              }}>
                <h1 style={{ fontSize: '4rem', margin: '0', color: '#e53e3e' }}>404</h1>
                <h2 style={{ color: '#2d3748', marginBottom: '16px' }}>Trang không tồn tại</h2>
                <p style={{ color: '#718096', marginBottom: '24px' }}>
                  Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
                </p>
                <a 
                  href="/"
                  style={{
                    background: '#4299e1',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  🏠 Về trang chủ
                </a>
              </div>
            </PublicLayout>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;