# PrimeFix Maintenance Services — website

A 4-page site (Home, Services, About, Contact) that:
- **reads** the services list from a **Google Sheet** (`Services` tab), and
- **writes** contact-form submissions into the same Sheet (`Leads` tab),

served as static files + Cloudflare Pages Functions (serverless, no separate backend host needed).

```
primefix-site/
├── index.html, services.html, about.html, contact.html
├── css/style.css
├── js/main.js        ← fetches /api/services, renders ticket cards
├── js/contact.js      ← posts the contact form to /api/leads
└── functions/
    ├── _shared/googleSheets.js   ← Google auth + Sheets API calls
    └── api/
        ├── services.js   (GET  /api/services)
        └── leads.js      (POST /api/leads)
```

Nothing on the client ever talks to Google directly — the browser only calls
`/api/services` and `/api/leads` on your own domain. The Functions hold the
Google credentials as server-side secrets, so nothing sensitive reaches the browser.

---

## 1. Set up the Google Sheet

Create one Google Sheet with two tabs:

**`Services`** (row 1 = header):

| A (ID) | B (Name) | C (Description) | D (New) |
|---|---|---|---|
| 1 | Ceiling Water Seepage | We detect and repair ceiling water seepage effectively. | |
| 2 | Skirting Level Seepage | We treat skirting level seepage and dampness permanently. | |
| 3 | Painting | Professional painting services for interior and exterior. | |
| 4 | Electrical | Safe and reliable electrical installation and repair services. | |
| 5 | Cleaning | Home, office and commercial cleaning services. | |
| 6 | Carpentry | All types of wood work, furniture, doors, windows and fittings. | |
| 7 | Sliding Windows & Doors | Sliding windows, doors, partitions installation and repair. | |
| 8 | Plumbing | All types of plumbing installation and repair services. | |
| 9 | Invisible Grill | Invisible grill for balcony, windows & staircase — safe & durable. | TRUE |
| 10 | Pigeon Net | Pigeon net installation — keep birds out, keep space clean. | TRUE |
| 11 | Fabrication Works | All types of fabrication works — MS, SS, gates, railings, shed & more. | TRUE |
| 12 | All Civil Works & More | Plumbing, tiles, plaster, masonry and all types of civil maintenance works. | |

Editing this tab (add a row, change text, flip "New" to TRUE) updates the live site — no redeploy needed.

**`Leads`** (row 1 = header, the Function appends rows below it):

| A (Timestamp) | B (Name) | C (Phone) | D (Email) | E (Service) | F (Message) |
|---|---|---|---|---|---|

Copy the **Sheet ID** from its URL — the long string between `/d/` and `/edit`:
`https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

## 2. Service account (you said credentials are ready — confirm you have)

1. In Google Cloud Console: enable the **Google Sheets API** on your project.
2. Create a **service account**, then create a **JSON key** for it.
3. From the JSON key, you need two values: `client_email` and `private_key`.
4. Open the Google Sheet → **Share** → add the service account's `client_email`
   as an **Editor**. (Without this share step, the API calls will fail even
   with valid credentials — the service account needs explicit access to *this* Sheet.)

## 3. Deploy to Cloudflare Pages

**Option A — dashboard (no CLI):**
1. Push this folder to a GitHub repo.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Build settings: framework preset **None**, build command **empty**, output directory **`/`** (the repo root — since this is static HTML, not built).
4. Deploy. Cloudflare auto-detects the `functions/` folder as Pages Functions.
5. Project → **Settings → Environment variables** → add as **secret**:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` — paste the full PEM, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
   - `GOOGLE_SHEET_ID`
6. Redeploy (env var changes need a new deployment to take effect).

**Option B — Wrangler CLI:**
```bash
npm install -g wrangler
cd primefix-site
wrangler pages project create primefix-site
wrangler pages secret put GOOGLE_CLIENT_EMAIL --project-name=primefix-site
wrangler pages secret put GOOGLE_PRIVATE_KEY  --project-name=primefix-site
wrangler pages secret put GOOGLE_SHEET_ID     --project-name=primefix-site
wrangler pages deploy . --project-name=primefix-site
```
For `GOOGLE_PRIVATE_KEY`, paste the key with real newlines when prompted (or a
single line with `\n` escapes — the code un-escapes it either way).

**Local dev:**
```bash
wrangler pages dev . --compatibility-date=2026-01-01
```
Then set the same three variables in a `.dev.vars` file (never commit this file):
```
GOOGLE_CLIENT_EMAIL=xxx@yyy.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_sheet_id
```

## 4. Custom domain

Cloudflare Pages project → **Custom domains** → add your domain (if it's
already on Cloudflare DNS this is a one-click attach; otherwise it walks you
through the CNAME/DNS step).

## Notes

- If `/api/services` isn't reachable yet (e.g. you're previewing the raw
  files before deploying, or the API errors), the site falls back to the
  12 default services baked into `js/main.js` — so it never shows a blank page.
- The contact form requires **name + phone**; email and message are optional.
- No API keys or secrets are ever sent to the browser — only used inside the
  Functions, which run server-side on Cloudflare's edge.
