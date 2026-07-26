import { readRange } from '../_shared/googleSheets.js';

/**
 * GET /api/services
 *
 * Reads the "Services" tab of the Google Sheet and returns a JSON array.
 * Expected sheet layout (row 1 = header, data starts row 2):
 *
 *   A: ID | B: Name | C: Description | D: New (TRUE/FALSE or yes/no)
 *
 * Rows with an empty Name are skipped, so the owner can leave blank rows
 * between entries without breaking the site.
 */
export async function onRequestGet({ env }) {
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

    return new Response(JSON.stringify(services), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
