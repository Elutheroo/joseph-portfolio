// Netlify Function: send email via Brevo (Sendinblue) API
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

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';
  const FROM_NAME = process.env.FROM_NAME || 'Portfolio Contact';
  const TO_EMAIL = process.env.TO_EMAIL || 'olapagbojoseph@gmail.com';

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY not configured');
    return { statusCode: 500, body: 'BREVO_API_KEY is not configured on the server.' };
  }

  const apiUrl = 'https://api.brevo.com/v3/smtp/email';

  const htmlContent = `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
  <p><strong>Email:</strong> ${escapeHtml(email)}</p>
  <p><strong>Message:</strong></p>
  <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`;

  const textContent = `Name: ${name}\nEmail: ${email}\n\n${message}`;

  const body = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: TO_EMAIL }],
    subject: `[Portfolio Contact] ${subject}`,
    htmlContent,
    textContent,
    replyTo: { email },
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    const text = await res.text();
    console.error('Brevo API error:', res.status, text);
    return { statusCode: 500, body: 'Failed to send email via Brevo' };
  } catch (err) {
    console.error('Error calling Brevo API', err);
    return { statusCode: 500, body: 'Error sending email' };
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
