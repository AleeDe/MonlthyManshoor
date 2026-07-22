# Sanity Migration — Setup Steps

The app now uses Sanity (project `3d1nttqq`, dataset `production`) instead of Supabase.
PDFs and images upload directly from the custom admin page to Sanity.

## One-time setup

### 1. Rotate the API token (IMPORTANT)
The token was shared in chat, so treat it as compromised:
- Go to https://sanity.io/manage → project → API → Tokens
- Delete the old token, create a new one with **Editor** permissions

### 2. Create the dataset (if not already)
At sanity.io/manage → Datasets → create `production` with **Public** visibility
(public read is required since the site reads without a token).

### 3. Add CORS origins
sanity.io/manage → API → CORS origins. Add:
- `http://localhost:5173` (allow credentials ✔)
- your deployed domain, e.g. `https://your-site.vercel.app` (allow credentials ✔)

### 4. Deploy on Vercel
- Import the GitHub repo at vercel.com
- Set Environment Variables:
  - `SANITY_WRITE_TOKEN` = the new Editor token
  - `ADMIN_PASSWORD` = your chosen admin password
- Deploy

### 5. Local development
`npm run dev` works for public pages. For admin login locally you need the
API route, so use `npx vercel dev` instead (after `npx vercel link` and
`npx vercel env pull`).

## How admin works now
- Footer → hidden "Login" link → enter admin password
- `/api/admin` verifies the password and returns the Sanity write token to your browser session only
- Admin panel uploads cover image + PDF directly to Sanity, creates `magazineIssue` / `sisterMagazine` documents

## Tips
- Compress PDFs before uploading (ilovepdf.com or Ghostscript) — browser-side compression isn't effective
- Old Supabase data is NOT migrated automatically; re-create issues via the admin panel (or ask for a migration script)
