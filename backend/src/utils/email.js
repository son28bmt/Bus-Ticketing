/**
 * Placeholder email sender. Integrate with real provider (e.g., SendGrid, Nodemailer) later.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    throw new Error('Missing recipient email address');
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[mail] preview email', { to, subject, text, html });
    return { queued: true };
  }

  // TODO: integrate with real email provider
  console.warn('sendEmail called without provider configuration');
  return { queued: false };
};

module.exports = {
  sendEmail,
};
