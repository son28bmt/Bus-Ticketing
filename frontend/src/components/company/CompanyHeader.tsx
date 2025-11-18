import { useEffect, useMemo, useState } from "react";
import { useUserStore } from "../../store/user";
import { useNavigate } from "react-router-dom";
import { companyAPI } from "../../services/company";
import "../admin/style/AdminHeader.css";
const CompanyHeader = () => {
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState<string | null>(() => {
    try {
      return localStorage.getItem("companyName");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let mounted = true;
    const fetchName = async () => {
      try {
        if (companyName) return; // already have it
        const res = await companyAPI.getTrips();
        if (res?.success && Array.isArray(res.data)) {
          for (const t of res.data) {
            const name = t?.company?.name || t?.bus?.company?.name;
            if (name) {
              if (!mounted) return;
              setCompanyName(name);
              try {
                localStorage.setItem("companyName", name);
              } catch {
                // ignore
              }
              break;
            }
          }
        }
      } catch (e) {
        console.error(e);
        // silent fail; keep fallback title
      }
    };
    void fetchName();
    return () => {
      mounted = false;
    };
  }, [companyName]);

  const headerTitle = useMemo(() => {
    return companyName ? `Quản trị • ${companyName}` : "Quản Trị Nhà Xe";
  }, [companyName]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("companyName");
    } catch {
      // ignore
    }
    navigate("/login");
  };

  return (
    <header className="company-header">
      <h1>{headerTitle}</h1>
      <div className="header-content">
        <h1>Bảng điều khiển</h1>

        <div className="header-actions">
          <div className="user-info">
            <span className="user-avatar">👨‍💼</span>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            🚪 Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
};

export default CompanyHeader;
