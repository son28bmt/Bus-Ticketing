import { Navigate, useLocation } from "react-router-dom";
import { useUserStore } from "../store/user";

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const user = useUserStore((state) => state.user);
  const location = useLocation();

  // ✅ Loading state check
  const isLoading = useUserStore((state) => state.isLoading);
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #4299e1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  // Nếu user chưa đăng nhập
  if (!user) {
    return <Navigate 
      to="/login" 
      state={{ from: location }} 
      replace 
    />;
  }

  // Nếu có quy định role và user không có role phù hợp
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Nếu mọi thứ OK, render children
  return <>{children}</>;
}