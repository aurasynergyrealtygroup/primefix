/**
 * Minimal Google Sheets API v4 client for Cloudflare Pages Functions.
 *
 * Auth: signs a service-account JWT with Web Crypto (RS256) and exchanges
 * it for an OAuth access token — no external libraries needed, so it runs
 * fine on the Workers runtime.
 *
 * Required environment variables / secrets (set via `wrangler pages secret
 * put` or the Cloudflare dashboard → Pages project → Settings → Environment
 * variables):
 *
 *   GOOGLE_CLIENT_EMAIL   service account email, e.g. xxx@yyy.iam.gserviceaccount.com
 *   GOOGLE_PRIVATE_KEY    the service account's private key (PEM), including
 *                         the -----BEGIN PRIVATE KEY----- / END lines
 *   GOOGLE_SHEET_ID       the spreadsheet ID (from its URL)
 *
 * The service account must be given "Editor" access to the target Sheet
 * (Share button in Google Sheets → add the service account's email).
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function base64url(bytes) {
  let str = typeof bytes === 'string'
    ? btoa(bytes)
    : btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(env) {
  const privateKeyPem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const signingInput =
    base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claims));

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signingInput)
  );

  const jwt = signingInput + '.' + base64url(signature);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Google auth failed: ' + res.status + ' ' + text);
  }
  const data = await res.json();
  return data.access_token;
}

export async function readRange(env, range) {
  const token = await getAccessToken(env);
  const url = `${SHEETS_BASE}/${env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Sheets read failed: ' + res.status + ' ' + (await res.text()));
  const data = await res.json();
  return data.values || [];
}

export async function appendRow(env, range, row) {
  const token = await getAccessToken(env);
  const url = `${SHEETS_BASE}/${env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [row] })
  });
  if (!res.ok) throw new Error('Sheets append failed: ' + res.status + ' ' + (await res.text()));
  return res.json();
}
