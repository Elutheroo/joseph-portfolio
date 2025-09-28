// Netlify Function: send email via Brevo (Sendinblue) API
// Adds server-side validation, light rate-limiting, and supports using a Brevo template (if BREVO_TEMPLATE_ID is set).

// Simple in-memory rate limiter (per IP) - survives warm invocations but not cold starts
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20; // max requests per IP per window
const ipCounters = new Map();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return json(400, { error: 'Invalid JSON' });
  }

  const { name, email, subject, message } = (payload || {});

  // Basic required checks
  if (!name || !email || !subject || !message) {
    return json(422, { error: 'Missing required fields' });
  }

  // Trim and limit lengths
  const nameT = String(name).trim();
  const emailT = String(email).trim();
  const subjectT = String(subject).trim();
  const messageT = String(message).trim();

  if (nameT.length > 100) return json(422, { error: 'Name too long (max 100 chars)' });
  if (subjectT.length > 150) return json(422, { error: 'Subject too long (max 150 chars)' });
  if (messageT.length > 5000) return json(422, { error: 'Message too long (max 5000 chars)' });

  // Email format check
  if (!isValidEmail(emailT)) return json(422, { error: 'Invalid email address' });

  // Rate limiting
  const ip = getClientIP(event) || 'unknown';
  const now = Date.now();
  const entry = ipCounters.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  ipCounters.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return json(429, { error: 'Too many requests. Please try again later.' });
  }

  // Prepare Brevo payload
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';
  const FROM_NAME = process.env.FROM_NAME || 'Portfolio Contact';
  const TO_EMAIL = process.env.TO_EMAIL || 'olapagbojoseph@gmail.com';
  const BREVO_TEMPLATE_ID = process.env.BREVO_TEMPLATE_ID; // optional

  if (!BREVO_API_KEY) return json(500, { error: 'Server not configured' });

  // Build request body. Prefer template usage to avoid raw HTML.
  let requestBody;
  if (BREVO_TEMPLATE_ID) {
    // Use templateId and params
    requestBody = {
      templateId: Number(BREVO_TEMPLATE_ID),
      to: [{ email: TO_EMAIL }],
      params: {
        name: nameT,
        email: emailT,
        subject: subjectT,
        message: messageT,
      },
      replyTo: { email: emailT },
      sender: { name: FROM_NAME, email: FROM_EMAIL },
    };
  } else {
    // Fallback to text-only request (no raw HTML)
    requestBody = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: TO_EMAIL }],
      subject: `[Portfolio Contact] ${subjectT}`,
      textContent: `Name: ${nameT}\nEmail: ${emailT}\n\n${messageT}`,
      replyTo: { email: emailT },
    };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (res.ok) return json(200, { ok: true });
    // Try to extract response body for debugging (avoid leaking secrets)
    let bodyText = await res.text().catch(() => 'unknown error');
    let parsedBody = null;
    try { parsedBody = JSON.parse(bodyText); } catch (e) { /* not JSON */ }
    console.error('Brevo error', res.status, parsedBody || bodyText);
    return json(500, { error: 'Failed to send email', providerStatus: res.status, providerBody: parsedBody || bodyText });
  } catch (err) {
    console.error('Brevo request failed', err);
    return json(500, { error: 'Failed to send email', detail: String(err && err.message ? err.message : err) });
  }
};

// Helpers
function json(status, obj) {
  return { statusCode: status, body: JSON.stringify(obj) };
}

function isValidEmail(email) {
  // simple, robust regex
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getClientIP(event) {
  // Try common headers
  const headers = (event.headers || {});
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || headers['x-nf-client-connection-ip'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return null;
}
