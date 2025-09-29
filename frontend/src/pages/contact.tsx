import { useState } from "react";
import "../style/contact.css";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // TODO: Gửi form data đến server
  };

  return (
    <div className="contact-container">
      <div className="contact-header">
        <h1>Liên hệ với chúng tôi</h1>
        <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
      </div>

      <div className="contact-content">
        <div className="contact-info">
          <div className="contact-card">
            <h3>📞 Hotline</h3>
            <p>1900-6067 (miễn phí)</p>
            <p>028-7108-6868</p>
          </div>

          <div className="contact-card">
            <h3>📧 Email</h3>
            <p>support@shanbus.com</p>
            <p>info@shanbus.com</p>
          </div>

          <div className="contact-card">
            <h3>📍 Địa chỉ</h3>
            <p>Số 123 Đường Nguyễn Văn Linh</p>
            <p>Quận 7, TP.HCM</p>
          </div>

          <div className="contact-card">
            <h3>🕒 Giờ làm việc</h3>
            <p>24/7 - Tất cả các ngày</p>
            <p>Hỗ trợ trực tuyến</p>
          </div>
        </div>

        <div className="contact-form">
          <h3>Gửi tin nhắn cho chúng tôi</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <input
                type="text"
                name="name"
                placeholder="Họ và tên *"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email *"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <input
                type="tel"
                name="phone"
                placeholder="Số điện thoại"
                value={formData.phone}
                onChange={handleChange}
              />
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              >
                <option value="">Chọn chủ đề *</option>
                <option value="booking">Đặt vé</option>
                <option value="refund">Hoàn tiền</option>
                <option value="technical">Lỗi kỹ thuật</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <textarea
              name="message"
              placeholder="Nội dung tin nhắn *"
              rows={5}
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>

            <button type="submit" className="submit-btn">
              Gửi tin nhắn
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}