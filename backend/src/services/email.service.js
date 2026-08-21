const nodemailer = require('nodemailer');

// Setup transporter
const createTransporter = () => {
  const isMock = !process.env.SMTP_USER || process.env.SMTP_USER === 'mock_user' || process.env.SMTP_USER.startsWith('your_');

  if (isMock) {
    // Return a mock transporter that logs emails to console
    return {
      sendMail: async (mailOptions) => {
        console.log('--- MOCK EMAIL SENT ---');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Body: ${mailOptions.text || mailOptions.html}`);
        console.log('-----------------------');
        return { messageId: 'mock-id-12345' };
      }
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 2525,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Smart Campus" <noreply@smartcampus.edu>',
      to,
      subject,
      text,
      html,
    });
    console.log(`Email dispatched: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Email Dispatch Failure: ${error.message}`);
  }
};

module.exports = { sendEmail };
