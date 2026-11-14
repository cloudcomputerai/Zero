/**
 * EgorMail shared Google OAuth relay (auth.email.egorai.com).
 *
 * All EgorMail instances share one Google OAuth client whose only redirect URIs are on this
 * host. Flow:
 *   1. An instance sends the browser to /start?t=<slug>&st=<state>&sig=<hmac>&u=<google url>.
 *      We check the HMAC with that tenant's secret (KV `TENANTS`), remember state -> slug in a
 *      short-lived cookie, and redirect to Google.
 *   2. Google redirects back to /callback/google or /imap-oauth/google/callback. We look up
 *      the slug for that state and forward the query string unchanged to the tenant's API,
 *      which validates state and exchanges the code itself.
 * The relay never sees tokens, only the one-time authorization code in transit.
 *
 * Bindings: TENANTS (KV: slug -> {"apiHost": "...", "relaySecret": "..."}).
 */

const GOOGLE_AUTH_HOST = 'accounts.google.com';
const FLOW_TTL_SECONDS = 600;
const CALLBACKS = {
  '/callback/google': '/api/auth/callback/google',
  '/imap-oauth/google/callback': '/api/imap-oauth/google/callback',
};
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const STATE_RE = /^[A-Za-z0-9_-]{8,128}$/;

const encoder = new TextEncoder();

const base64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export async function relaySignature(secret, slug, state) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${slug}|${state}`))));
}

const timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const cookieName = (state) => `__Host-egm-${state}`;

const readCookie = (request, name) => {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
};

const page = (status, message) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EgorMail sign-in</title><body style="font:16px system-ui;background:#000;color:#e6ffe6;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:420px;padding:24px;text-align:center"><h1 style="color:#33ff33;font:700 22px ui-monospace,monospace">EgorMail</h1><p>${message}</p></main>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );

async function loadTenant(env, slug) {
  if (!SLUG_RE.test(slug || '')) return null;
  const tenant = await env.TENANTS.get(slug, 'json');
  return tenant && tenant.apiHost && tenant.relaySecret ? tenant : null;
}

async function start(request, env, url) {
  const slug = url.searchParams.get('t') || '';
  const state = url.searchParams.get('st') || '';
  const sig = url.searchParams.get('sig') || '';
  const target = url.searchParams.get('u') || '';
  if (!STATE_RE.test(state)) return page(400, 'This sign-in link is invalid.');

  const tenant = await loadTenant(env, slug);
  if (!tenant) return page(404, 'Unknown EgorMail workspace.');
  if (!timingSafeEqual(sig, await relaySignature(tenant.relaySecret, slug, state))) {
    return page(403, 'This sign-in link is invalid.');
  }

  let google;
  try {
    google = new URL(target);
  } catch {
    return page(400, 'This sign-in link is invalid.');
  }
  const redirect = google.searchParams.get('redirect_uri') || '';
  if (
    google.protocol !== 'https:' ||
    google.host !== GOOGLE_AUTH_HOST ||
    google.searchParams.get('state') !== state ||
    !Object.keys(CALLBACKS).some((path) => redirect === `${url.origin}${path}`)
  ) {
    return page(400, 'This sign-in link is invalid.');
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: google.toString(),
      'set-cookie': `${cookieName(state)}=${slug}; Max-Age=${FLOW_TTL_SECONDS}; Path=/; Secure; HttpOnly; SameSite=Lax`,
      'cache-control': 'no-store',
    },
  });
}

async function callback(request, env, url, apiPath) {
  const state = url.searchParams.get('state') || '';
  if (!STATE_RE.test(state)) return page(400, 'This sign-in response is invalid.');
  const slug = readCookie(request, cookieName(state));
  const tenant = slug && (await loadTenant(env, slug));
  if (!tenant) {
    return page(400, 'Your sign-in took too long or was started in another browser. Please try again.');
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: `https://${tenant.apiHost}${apiPath}${url.search}`,
      'set-cookie': `${cookieName(state)}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`,
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return page(405, 'Method not allowed.');
    if (url.pathname === '/start') return start(request, env, url);
    if (CALLBACKS[url.pathname]) return callback(request, env, url, CALLBACKS[url.pathname]);
    if (url.pathname === '/health') return new Response('ok');
    return Response.redirect('https://egorai.com/egormail', 302);
  },
};
