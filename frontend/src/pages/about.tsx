import "../style/about.css";

export default function About() {
  return (
    <div className="about-container">
      <div className="about-header">
        <h1>Giới thiệu về ShanBus</h1>
        <p>Hệ thống đặt vé xe khách trực tuyến hàng đầu Việt Nam</p>
      </div>

      <div className="about-content">
        <section className="system-intro">
          <h2>🚌 Giới thiệu hệ thống</h2>
          <div className="intro-cards">
            <div className="intro-card">
              <h3>Đặt vé nhanh chóng</h3>
              <p>Chỉ với vài cú click, bạn có thể đặt vé xe khách đi bất kỳ đâu trên toàn quốc</p>
            </div>
            <div className="intro-card">
              <h3>Thanh toán an toàn</h3>
              <p>Hỗ trợ nhiều hình thức thanh toán: ATM, Visa, MasterCard, ZaloPay, MoMo</p>
            </div>
            <div className="intro-card">
              <h3>Dịch vụ 24/7</h3>
              <p>Hệ thống hoạt động 24/7, hỗ trợ khách hàng mọi lúc mọi nơi</p>
            </div>
          </div>
        </section>

        <section className="partners">
          <h2>🏢 Các nhà xe đối tác</h2>
          <div className="partners-grid">
            <div className="partner-card">
              <h3>Phương Trang (FUTA Bus Lines)</h3>
              <p>Nhà xe hàng đầu với hơn 60 tuyến đường, phục vụ hơn 40 tỉnh thành</p>
              <div className="partner-info">
                <span>⭐ 4.8/5 (12,543 đánh giá)</span>
                <span>🚌 200+ xe</span>
              </div>
            </div>

            <div className="partner-card">
              <h3>Xe Liên Hùng</h3>
              <p>Chuyên tuyến Sài Gòn - Đà Lạt, xe limousine cao cấp</p>
              <div className="partner-info">
                <span>⭐ 4.7/5 (8,234 đánh giá)</span>
                <span>🚌 50+ xe</span>
              </div>
            </div>

            <div className="partner-card">
              <h3>Thành Bưởi</h3>
              <p>Tuyến Hà Nội - Lào Cai, xe giường nằm chất lượng cao</p>
              <div className="partner-info">
                <span>⭐ 4.6/5 (6,789 đánh giá)</span>
                <span>🚌 80+ xe</span>
              </div>
            </div>

            <div className="partner-card">
              <h3>Mai Linh Express</h3>
              <p>Mạng lưới rộng khắp cả nước, đa dạng loại xe</p>
              <div className="partner-info">
                <span>⭐ 4.5/5 (15,432 đánh giá)</span>
                <span>🚌 300+ xe</span>
              </div>
            </div>
          </div>
        </section>

        <section className="achievements">
          <h2>🏆 Thành tựu đạt được</h2>
          <div className="achievements-stats">
            <div className="stat-item">
              <h3>2M+</h3>
              <p>Khách hàng tin tưởng</p>
            </div>
            <div className="stat-item">
              <h3>50+</h3>
              <p>Nhà xe đối tác</p>
            </div>
            <div className="stat-item">
              <h3>200+</h3>
              <p>Tuyến đường</p>
            </div>
            <div className="stat-item">
              <h3>99.9%</h3>
              <p>Thời gian hoạt động</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}