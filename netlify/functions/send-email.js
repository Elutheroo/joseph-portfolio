const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { name, email, subject, message } = payload || {};
  if (!name || !email || !subject || !message) {
    return { statusCode: 422, body: 'Missing required fields' };
  }

  // Read SMTP credentials and destination from environment variables
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT || 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
  const TO_EMAIL = process.env.TO_EMAIL || 'olapagbojoseph@gmail.com';

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('SMTP credentials not configured');
    return { statusCode: 500, body: 'SMTP not configured on server. Please set SMTP_HOST/SMTP_USER/SMTP_PASS.' };
  }

  // Create transporter
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } catch (err) {
    console.error('Failed to create transporter', err);
    return { statusCode: 500, body: 'Failed to create email transporter' };
  }

  const mailOptions = {
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `[Portfolio Contact] ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('Error sending email', err);
    return { statusCode: 500, body: 'Failed to send email' };
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
