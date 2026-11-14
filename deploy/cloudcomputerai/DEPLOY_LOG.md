# cloudcomputerai Zero deploy log (no secrets)

## 2026-11-13
- Forked Mail-0/Zero -> cloudcomputerai/Zero (Composio GitHub ca_lacwvDzqZb1e). Branch `cloudcomputerai`.
- Architecture (owner choice): all on Cloudflare. Backend Worker `ccai-email-<slug>-server` at api.<APP_HOST>, frontend assets Worker `ccai-email-<slug>-web` at <APP_HOST>. Postgres + Valkey/REST proxy per instance on gex44-apps (127.0.0.1), reached via one Cloudflare Tunnel (Hyperdrive over Tunnel + Access; Redis REST over tunnel, token-auth).
- Deploys go through Composio `cloudflare_mcp` (account bc8e15f958dc350e00c0e39d80ca6941); wrangler is used only for `--dry-run` bundling.
- Verified: render_wrangler.py output bundles (main.js 10.7 MB raw); frontend SPA builds with owner URLs (287 files, 88 MB); compose files validate on gex44-apps; ports 15432/18079 free.
- Keiki optional (assistant only). Upstream trustedOrigins still lists 0.email origins (left unchanged to keep diff minimal).

## 2026-11-14 — owner instance deployed (email.cloudcomputerai.com)
- gex44-apps: `/opt/ccai-email/owner` (Postgres 17 w/ self-signed TLS — Hyperdrive requires TLS —, Valkey, SRH REST proxy), nightly pg_dump cron, `/opt/ccai-email/tunnel` cloudflared. Drizzle migrations applied.
- Cloudflare (via Composio `cloudflare_mcp`; the `cloudflare` toolkit connection has a malformed API key): R2, 2 queues, 3 KV, 2 Vectorize (1024/cosine), tunnel `ccai-email-gex44`, Access app + service token on `ccai-email-owner-pg`, Hyperdrive `ccai-email-owner-pg`. IDs in `instances/owner.state.json`.
- Workers: `ccai-email-owner-server` @ api.email.cloudcomputerai.com (cron, both queue consumers), `ccai-email-owner-web` @ email.cloudcomputerai.com (static assets, SPA).
- New accounts can't create KV-backed DO namespaces: upstream migrations collapsed into one `new_sqlite_classes` step at tag v9 (`cf/gen_server_js.py`).
- Composio caps request bodies (~2 MB): backend bundle sent minified+gzip+base64 and gunzipped in the MCP sandbox; frontend assets uploaded directly with the assets-upload-session JWT (`cf/assets.py`).
- Code change: `lib/auth.ts` builds the Twilio client lazily (upstream threw on every auth request without Twilio).
- Secrets: `~/.config/ccai-email/owner.secrets.env` on the operator workstation (600), server-side `.env` files (600).
- Pending: GOOGLE_CLIENT_ID/SECRET (sign-in), OPENROUTER_API_KEY (AI), optional RESEND_API_KEY.

## 2026-11-14 — Google sign-in unblocked
- Google OAuth client "CCAI Email Web" in GCP project `email-cloudcomputerai-com` (Testing mode, owner as test user). GOOGLE_CLIENT_ID/SECRET added to owner.secrets.env and set as Worker secrets on `ccai-email-owner-server` via Composio `cloudflare_mcp` (PUT .../secrets, no rebuild).
- Backend also refused auth without Autumn (billing): set placeholder `AUTUMN_SECRET_KEY`; Autumn calls already tolerate billing being unavailable. Replace with a real key if billing is wanted.
- Verified: /api/auth/sign-in/social returns accounts.google.com URL with correct client_id and redirect_uri.
- TODO: add `https://mail.google.com/` to consent-screen scopes (Zero requests it); OPENROUTER_API_KEY for AI.
- Fixed blank frontend: `cf/assets.py` uploaded every asset as `application/null`, so Cloudflare served JS/HTML/CSS with an empty Content-Type and browsers refused the module scripts. Now sends the real MIME type and includes it in the asset hash (forces re-upload of previously stored copies). Re-uploaded all 287 assets and redeployed `ccai-email-owner-web`.

## 2026-11-14 — Rebranded to EgorMail, moved to egorai.com
- App: https://email.egorai.com (`ccai-email-owner-web`), API: https://api.email.egorai.com (`ccai-email-owner-server`). egorai.com zone `825e6c0323ed2220ecae59a7472befc5` stored as `app_zone_id` in owner.state.json. Old email.cloudcomputerai.com / api.email.cloudcomputerai.com custom domains detached (no redirect, by owner's choice). DB/Redis tunnel hostnames stay on cloudcomputerai.com.
- Rebrand: user-facing "Zero"/"0.email" -> "EgorMail" (assistant persona "Egor"), Egor icons/favicon/PWA icons from egorai.com, title/manifest/site-config, neutral welcome email, sender `noreply@egorai.com`, 0.email trustedOrigins removed. Kept: MIT LICENSE, "Zero Email Inc." headers on agent files (non-MIT notice, see routes/agent/*, lib/analyze/interests.ts), internal X-Zero-* headers, upstream legal pages (privacy/terms/about/contributors) and @0.email signup pages, onboarding images hotlinked from assets.0.email.
- `cf/gen_server_js.py` now also carries AUTUMN_SECRET_KEY (full script PUT replaces secrets) and uses `app_zone_id` for the custom domain.
- Sales page: https://egorai.com/egormail, static file `/var/www/egormail/index.html` on gex44-apps (source: `egormail-site/index.html`), nginx exact-match locations in `/etc/nginx/sites-available/egorai.com.conf` (+ /email, /mail -> /egormail). Backup of prior config in /root/egorai.com.conf.bak-*.
- Server tests: 370/370 pass.
- TODO (owner, Google Console): add origin https://email.egorai.com + redirect https://api.email.egorai.com/api/auth/callback/google; rename consent screen to EgorMail. Replace upstream privacy/terms pages with your own.
