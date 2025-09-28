// Netlify Function: track-visit
// Purpose: Receive a POST from client when a portfolio/case-study page is viewed (organic-only)
// - Performs light bot filtering
// - Resolves client IP and geolocation (via ip-api.com)
// - Sends an email notification via Brevo (SMTP API) using BREVO_API_KEY

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Invalid JSON' }); }

  const { caseStudy, page, referrer, userAgent, visitorCount } = payload || {};

  // Basic checks
  if (!page && !caseStudy) return json(422, { error: 'Missing page or caseStudy' });

  // Reject obvious bots by UA
  const ua = (userAgent || event.headers['user-agent'] || '').toLowerCase();
  const botSignatures = ['bot', 'crawl', 'spider', 'slurp', 'bingpreview', 'mediapartners-google'];
  if (botSignatures.some(s => ua.includes(s))) return json(204, { ok: true, ignored: 'bot' });

  // Reject requests that include obvious campaign indicators (double-check server-side)
  const hasUtm = (event.queryStringParameters && Object.keys(event.queryStringParameters).some(k => k.startsWith('utm_')));
  if (hasUtm) return json(204, { ok: true, ignored: 'utm' });

  // Determine client IP
  const ip = getClientIP(event) || (payload.ip || 'unknown');

  // Get geo info (best-effort). Use ip-api.com (free, limited). If fails, continue without geo.
  let geo = { status: 'unknown' };
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,zip,lat,lon,query,isp`);
    geo = await geoRes.json();
  } catch (e) { /* ignore geo errors */ }

  // Build email text
  const subject = `Portfolio Visit${caseStudy ? ` — ${caseStudy}` : ''}`;
  const bodyLines = [];
  bodyLines.push(`Page: ${page || 'unknown'}`);
  if (caseStudy) bodyLines.push(`Case Study: ${caseStudy}`);
  bodyLines.push(`Visitor IP: ${geo && geo.query ? geo.query : ip}`);
  if (geo && geo.status === 'success') {
    bodyLines.push(`Location: ${geo.city || '-'}, ${geo.regionName || '-'}, ${geo.country || '-'} (${geo.lat || '-'}, ${geo.lon || '-'})`);
    bodyLines.push(`ISP: ${geo.isp || '-'} | ZIP: ${geo.zip || '-'} `);
  }
  bodyLines.push(`Referrer: ${referrer || 'direct / none'}`);
  bodyLines.push(`User Agent: ${userAgent || ua || 'unknown'}`);
  bodyLines.push(`Visitor view count (this browser): ${typeof visitorCount !== 'undefined' ? visitorCount : 'unknown'}`);
  bodyLines.push('---');
  bodyLines.push(`Timestamp: ${new Date().toISOString()}`);

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';
  const FROM_NAME = process.env.FROM_NAME || 'Portfolio Notification';
  const TO_EMAIL = process.env.TO_EMAIL || 'olapagbojoseph@gmail.com';

  if (!BREVO_API_KEY) return json(500, { error: 'Server: BREVO_API_KEY not set' });

  const textContent = bodyLines.join('\n');

  const requestBody = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: TO_EMAIL }],
    subject,
    textContent,
  };

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => 'no body');
      console.error('Brevo send failed', res.status, txt);
      return json(500, { error: 'Failed to send notification' });
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error('Track-visit error', err);
    return json(500, { error: 'Server error' });
  }
};

// Helpers
function json(status, obj) { return { statusCode: status, body: JSON.stringify(obj) }; }

function getClientIP(event) {
  const headers = event.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || headers['x-nf-client-connection-ip'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return null;
}
