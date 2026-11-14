// node --test deploy/cloudcomputerai/auth-relay/worker.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker, { relaySignature } from './worker.js';

const RELAY = 'https://auth.email.egorai.com';
const tenants = { acme: { apiHost: 'api.acme.email.egorai.com', relaySecret: 'acme-secret' } };
const env = { TENANTS: { get: async (k) => tenants[k] ?? null } };
const STATE = 'abcDEF123_-xyz';
const googleUrl = (state = STATE, redirect = `${RELAY}/callback/google`) =>
  `https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=${state}&redirect_uri=${encodeURIComponent(redirect)}`;

const startUrl = async ({ t = 'acme', st = STATE, secret = 'acme-secret', u = googleUrl() } = {}) => {
  const url = new URL('/start', RELAY);
  url.searchParams.set('t', t);
  url.searchParams.set('st', st);
  url.searchParams.set('sig', await relaySignature(secret, t, st));
  url.searchParams.set('u', u);
  return url;
};
const get = (url, cookie) =>
  worker.fetch(new Request(url, { headers: cookie ? { cookie } : {} }), env);

test('start redirects to Google and remembers the tenant for that state', async () => {
  const res = await get(await startUrl());
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), googleUrl());
  assert.match(res.headers.get('set-cookie'), new RegExp(`^__Host-egm-${STATE}=acme;`));
});

test('start rejects a bad signature, unknown tenant, non-Google target or mismatched state', async () => {
  assert.equal((await get(await startUrl({ secret: 'wrong' }))).status, 403);
  assert.equal((await get(await startUrl({ t: 'nobody' }))).status, 404);
  assert.equal((await get(await startUrl({ u: 'https://evil.example/?state=' + STATE }))).status, 400);
  assert.equal((await get(await startUrl({ u: googleUrl('otherstate123') }))).status, 400);
  assert.equal(
    (await get(await startUrl({ u: googleUrl(STATE, 'https://api.acme.email.egorai.com/x') }))).status,
    400,
  );
});

test('callback forwards code and state to the tenant API unchanged', async () => {
  const cb = `${RELAY}/callback/google?state=${STATE}&code=4%2Fabc&scope=email`;
  const res = await get(cb, `__Host-egm-${STATE}=acme`);
  assert.equal(res.status, 302);
  assert.equal(
    res.headers.get('location'),
    `https://api.acme.email.egorai.com/api/auth/callback/google?state=${STATE}&code=4%2Fabc&scope=email`,
  );
  assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
});

test('IMAP XOAUTH2 callback goes to the imap-oauth route', async () => {
  const res = await get(`${RELAY}/imap-oauth/google/callback?state=${STATE}&code=c`, `__Host-egm-${STATE}=acme`);
  assert.equal(
    res.headers.get('location'),
    `https://api.acme.email.egorai.com/api/imap-oauth/google/callback?state=${STATE}&code=c`,
  );
});

test('callback without the flow cookie is refused', async () => {
  const res = await get(`${RELAY}/callback/google?state=${STATE}&code=c`);
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('location'), null);
});
