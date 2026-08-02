# PrimeFix Maintenance Services — website

A 4-page site (Home, Services, About, Contact) that:
- **reads** the services list from a **Google Sheet** (`Services` tab), and
- **writes** contact-form submissions into the same Sheet (`Leads` tab),

deployed as a single **Cloudflare Worker with static assets** (this is what
your Cloudflare project is set up as — its build command is `npx wrangler
deploy`, which is the Workers deploy command, not the Pages one).

```
primefix-site/
├── index.html, services.html, about.html, contact.html
├── css/style.css
├── js/main.js        ← fetches /api/services, renders ticket cards
├── js/contact.js      ← posts the contact form to /api/leads
├── wrangler.toml      ← tells Wrangler how to serve this as Workers + assets
├── .assetsignore      ← keeps src/, wrangler.toml etc. out of the public site
└── src/
    ├── worker.js       ← the one Worker entry point (routes /api/*, else serves assets)
    └── googleSheets.js ← Google auth + Sheets API calls
```

The browser only ever calls `/api/services` and `/api/leads` on your own
domain — `src/worker.js` holds the Google credentials as server-side secrets,
so nothing sensitive reaches the browser. Every other request (HTML, CSS,
JS, images) is served automatically via the `ASSETS` binding in
`wrangler.toml` — no code needed for that part.

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

**`Leads`** (row 1 = header, the Worker appends rows below it):

| A (Timestamp) | B (Name) | C (Phone) | D (Email) | E (Service) | F (Message) |
|---|---|---|---|---|---|

Copy the **Sheet ID** from its URL — the long string between `/d/` and `/edit`:
`https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

## 2. Service account

1. In Google Cloud Console: enable the **Google Sheets API** on your project.
2. Create a **service account**, then create a **JSON key** for it.
3. From the JSON key, you need two values: `client_email` and `private_key`.
4. Open the Google Sheet → **Share** → add the service account's `client_email`
   as an **Editor**. Without this share step, the API calls fail even with
   valid credentials — the service account needs explicit access to *this* Sheet.

## 3. Add secrets to your Cloudflare Worker project

Cloudflare dashboard → your `primefix` project → **Settings → Variables and
Secrets** → add as **secret** (not plain text, since these are credentials):
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY` — paste the full PEM, including the
  `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines
- `GOOGLE_SHEET_ID`

Then trigger a redeploy (push any small commit, or use "Retry deployment") —
env var changes need a new deployment to take effect.

## 4. Deploy

Since your project is already Git-connected with the build command
`npx wrangler deploy`, you don't need to change anything there — just push
this folder (including `wrangler.toml` and `src/`) to your repo:
```bash
git add .
git commit -m "Switch to Workers static-assets architecture"
git push
```
Cloudflare will run `npx wrangler deploy`, which now has everything it needs
(`main` entry point + `[assets]` directory) to succeed.

**Local dev / testing before pushing:**
```bash
npx wrangler dev
```
Set the same three variables in a `.dev.vars` file in the project root
(never commit this file — it's already in `.assetsignore` and should also be
in `.gitignore`):
```
GOOGLE_CLIENT_EMAIL=xxx@yyy.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_sheet_id
```

## 5. Custom domain

Cloudflare project → **Settings → Domains & Routes** → add your domain (if
it's already on Cloudflare DNS this is a one-click attach; otherwise it walks
you through the CNAME/DNS step).

## Notes

- If `/api/services` isn't reachable yet, or errors, the site falls back to
  the 12 default services baked into `js/main.js` — so it never shows a
  blank page.
- The contact form requires **name + phone**; email and message are optional.
- No API keys or secrets are ever sent to the browser — only used inside
  `src/worker.js`, which runs server-side.
- The 12 service photos live in `images/services/1.jpg` through `12.jpg` —
  drop in higher-resolution real job photos any time using those same
  filenames and no other changes are needed.
