// Netlify Function: track-visit
// Purpose: Receive a POST from client when a portfolio/case-study page is viewed (organic-only)
// - Performs light bot filtering
// - Resolves client IP and geolocation (via ip-api.com)
// - Persists visit and counts to Neon (Postgres) when NEON_DATABASE_URL is set
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
  const ua = (userAgent || (event.headers && event.headers['user-agent']) || '').toLowerCase();
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

  // Persist to Neon/Postgres if configured
  let globalViews = null;
  try {
    const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || null;
    if (DATABASE_URL) {
      // Attempt to require 'pg' and run DB operations
      let { Client } = require('pg');
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();

      // Create tables if they don't exist (safe - idempotent)
      await client.query(`CREATE TABLE IF NOT EXISTS case_study_counts (
        slug TEXT PRIMARY KEY,
        title TEXT,
        views BIGINT DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS visits (
        id BIGSERIAL PRIMARY KEY,
        case_study_slug TEXT,
        case_study_title TEXT,
        ip TEXT,
        city TEXT,
        region TEXT,
        country TEXT,
        lat DOUBLE PRECISION,
        lon DOUBLE PRECISION,
        isp TEXT,
        user_agent TEXT,
        referrer TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);

      // generate slug from title or page
      const slug = slugify(caseStudy || page || 'page');

      // upsert counter
      const upsertRes = await client.query(`INSERT INTO case_study_counts (slug, title, views, updated_at)
        VALUES ($1, $2, 1, now())
        ON CONFLICT (slug) DO UPDATE SET views = case_study_counts.views + 1, updated_at = now()
        RETURNING views`, [slug, caseStudy || page]);

      if (upsertRes && upsertRes.rows && upsertRes.rows[0]) globalViews = upsertRes.rows[0].views;

      // insert visit row
      await client.query(`INSERT INTO visits (case_study_slug, case_study_title, ip, city, region, country, lat, lon, isp, user_agent, referrer)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
        slug,
        caseStudy || page,
        geo && geo.query ? geo.query : ip,
        geo && geo.city ? geo.city : null,
        geo && geo.regionName ? geo.regionName : null,
        geo && geo.country ? geo.country : null,
        geo && geo.lat ? geo.lat : null,
        geo && geo.lon ? geo.lon : null,
        geo && geo.isp ? geo.isp : null,
        userAgent || ua || null,
        referrer || null,
      ]);

      await client.end();
    }
  } catch (dbErr) {
    // If pg isn't installed or DB error, log and continue; notification still sent
    console.warn('Neon DB persistence skipped or failed:', dbErr && dbErr.message ? dbErr.message : dbErr);
  }

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
  if (globalViews !== null) bodyLines.push(`Total views (all visitors): ${globalViews}`);
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

function slugify(str){
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'page';
}
