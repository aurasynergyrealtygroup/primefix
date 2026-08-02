import { readRange, appendRow } from './googleSheets.js';

/**
 * Single Worker entry point for the site.
 *
 * Static files (HTML/CSS/JS/images) are served automatically via the
 * ASSETS binding (configured in wrangler.toml). This script only needs to
 * handle the two API routes that talk to the Google Sheet; everything
 * else falls straight through to env.ASSETS.fetch(request).
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/services' && request.method === 'GET') {
      return handleServices(env);
    }

    if (url.pathname === '/api/leads' && request.method === 'POST') {
      return handleLeads(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

/**
 * GET /api/services — reads the "Services" tab of the Google Sheet.
 * Expected layout (row 1 = header, data from row 2):
 *   A: ID | B: Name | C: Description | D: New (TRUE/FALSE or yes/no)
 */
async function handleServices(env) {
  try {
    const rows = await readRange(env, 'Services!A2:D');

    const services = rows
      .filter((r) => r[1] && r[1].trim())
      .map((r) => ({
        id: r[0] ? Number(r[0]) : undefined,
        name: r[1] ? r[1].trim() : '',
        description: r[2] ? r[2].trim() : '',
        isNew: /^(true|yes)$/i.test((r[3] || '').trim())
      }));

    return json(services, 200, { 'Cache-Control': 'public, max-age=120' });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}

/**
 * POST /api/leads — appends a contact-form submission to the "Leads" tab.
 * Body (JSON): { name, phone, email, service, message }
 * Row written: Timestamp | Name | Phone | Email | Service | Message
 */
async function handleLeads(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const name = (body.name || '').toString().trim();
  const phone = (body.phone || '').toString().trim();

  if (!name || !phone) {
    return json({ error: 'name and phone are required' }, 400);
  }

  const row = [
    new Date().toISOString(),
    name,
    phone,
    (body.email || '').toString().trim(),
    (body.service || '').toString().trim(),
    (body.message || '').toString().trim()
  ];

  try {
    await appendRow(env, 'Leads!A:F', row);
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}
