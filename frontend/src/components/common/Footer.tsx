import { Link } from 'react-router-dom';
import '../../style/footer.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="modern-footer" role="contentinfo">
      <div className="container">
        <div className="footer-content" aria-label="Thông tin chân trang">
          <div className="footer-section">
            <h3>
              <Link to="/" aria-label="Trang chủ ShanBus" className="brand-link">
                ShanBus
              </Link>
            </h3>
            <p>Hệ thống đặt vé xe khách trực tuyến hàng đầu Việt Nam</p>
            <div className="social-links" aria-label="Mạng xã hội">
              {/* Chỗ dành cho liên kết mạng xã hội nếu cần thêm sau */}
            </div>
          </div>

          <nav className="footer-section" aria-label="Dịch vụ">
            <h4>Dịch vụ</h4>
            <ul>
              <li><Link to="/search">Đặt vé trực tuyến</Link></li>
              <li><Link to="/about">Về chúng tôi</Link></li>
              <li><Link to="/news">Tin tức</Link></li>
              <li><Link to="/contact">Liên hệ</Link></li>
            </ul>
          </nav>

          <nav className="footer-section" aria-label="Hỗ trợ">
            <h4>Hỗ trợ</h4>
            <ul>
              <li><Link to="/help">Trung tâm trợ giúp</Link></li>
              <li><Link to="/privacy">Chính sách bảo mật</Link></li>
              <li><Link to="/terms">Điều khoản sử dụng</Link></li>
              <li><Link to="/faq">Câu hỏi thường gặp</Link></li>
            </ul>
          </nav>

          <div className="footer-section" aria-label="Liên hệ">
            <h4>Liên hệ</h4>
            <ul>
              <li>
                Hotline: <a href="tel:0915582684" aria-label="Gọi hotline 0915 582 684">0915 582 684</a>
              </li>
              <li>
                Email: <a href="mailto:QuangSonnguyen2807@gmail.com">QuangSonnguyen2807@gmail.com</a>
              </li>
              <li>Địa chỉ: 574/12 Trưng Nữ Vương, TP Đà Nẵng</li>
              <li>Hỗ trợ: 24/7 - Tất cả các ngày</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {year} ShanBus. Tất cả quyền được bảo lưu.</p>
          <p>Phát triển bởi Nguyễn Quang Sơn - GuangShan</p>
        </div>
      </div>
    </footer>
  );
}
