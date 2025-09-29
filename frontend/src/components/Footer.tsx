import '../style/footer.css';

export default function Footer() {
  return (
    <footer className="modern-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>🚌 ShanBus</h3>
            <p>Hệ thống đặt vé xe khách trực tuyến hàng đầu Việt Nam</p>
            <div className="social-links">
              <a href="#" aria-label="Facebook">📘</a>
              <a href="#" aria-label="Twitter">🐦</a>
              <a href="#" aria-label="Instagram">📷</a>
              <a href="#" aria-label="YouTube">📺</a>
            </div>
          </div>
          
          <div className="footer-section">
            <h4>Dịch vụ</h4>
            <ul>
              <li><a href="/search">Đặt vé trực tuyến</a></li>
              <li><a href="/about">Về chúng tôi</a></li>
              <li><a href="/news">Tin tức</a></li>
              <li><a href="/contact">Liên hệ</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Hỗ trợ</h4>
            <ul>
              <li><a href="/help">Trung tâm trợ giúp</a></li>
              <li><a href="/privacy">Chính sách bảo mật</a></li>
              <li><a href="/terms">Điều khoản sử dụng</a></li>
              <li><a href="/faq">Câu hỏi thường gặp</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Liên hệ</h4>
            <ul>
              <li>📞 Hotline: 1900-6067</li>
              <li>✉️ Email: support@shanbus.com</li>
              <li>📍 Địa chỉ: 123 Nguyễn Văn Linh, Q.7, TP.HCM</li>
              <li>🕒 24/7 - Tất cả các ngày</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 ShanBus. Tất cả quyền được bảo lưu.</p>
          <p>Phát triển bởi Team ShanBus</p>
        </div>
      </div>
    </footer>
  );
}