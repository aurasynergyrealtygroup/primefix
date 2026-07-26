import { appendRow } from '../_shared/googleSheets.js';

/**
 * POST /api/leads
 *
 * Body (JSON): { name, phone, email, service, message }
 * Appends one row to the "Leads" tab of the Google Sheet:
 *   A: Timestamp | B: Name | C: Phone | D: Email | E: Service | F: Message
 */
export async function onRequestPost({ request, env }) {
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

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
