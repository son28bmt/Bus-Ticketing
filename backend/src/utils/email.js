const nodemailer = require('nodemailer');

const {
  MAIL_DRIVER = 'smtp',
  MAIL_HOST,
  MAIL_PORT = 587,
  MAIL_SECURE = 'false',
  MAIL_USERNAME,
  MAIL_PASSWORD,
  MAIL_FROM_NAME = 'ShanBus',
  MAIL_FROM_ADDRESS = 'no-reply@shanbus.com'
} = process.env;

let transporter;

if (MAIL_DRIVER === 'smtp') {
  transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: Number(MAIL_PORT),
    secure: MAIL_SECURE === 'true',
    auth: {
      user: MAIL_USERNAME,
      pass: MAIL_PASSWORD
    }
  });
}

// TODO: thêm các driver khác nếu muốn
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) throw new Error('Missing recipient email address');

  if (!transporter) {
    console.warn('[mail] transporter not configured');
    return { queued: false };
  }

  const mailOptions = {
    from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    text,
    html
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('[mail] sent', info.messageId);
  return { queued: true, messageId: info.messageId };
};

module.exports = { sendEmail };
