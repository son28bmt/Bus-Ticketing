const { ContactMessage } = require('../../models');

// Persist contact messages if the model exists, otherwise log for later review
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên, email và nội dung liên hệ',
      });
    }

    if (ContactMessage && typeof ContactMessage.create === 'function') {
      await ContactMessage.create({
        name: String(name).trim(),
        email: String(email).trim(),
        phone: phone ? String(phone).trim() : null,
        subject: subject ? String(subject).trim() : null,
        message: String(message).trim(),
      });
    } else {
      console.warn('ContactMessage model missing, fallback to console log');
      console.info('Contact message:', { name, email, phone, subject, message });
    }

    return res.status(201).json({
      success: true,
      message: 'Đã tiếp nhận yêu cầu liên hệ',
    });
  } catch (error) {
    console.error('common.submitContact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi yêu cầu liên hệ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  submitContact,
};
