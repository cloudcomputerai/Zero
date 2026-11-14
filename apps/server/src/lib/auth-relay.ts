/**
 * Shared Google OAuth callback for multi-tenant EgorMail.
 *
 * Every instance uses the same Google OAuth client, whose only redirect URIs live on the
 * shared relay (e.g. https://auth.email.egorai.com/callback/google). Before sending the user
 * to Google, an instance wraps the authorization URL in a signed `/start` link so the relay
 * can remember which instance the OAuth `state` belongs to; after Google redirects back, the
 * relay forwards code + state unchanged to that instance, which exchanges the code itself
 * (using the relay URL as redirect_uri, exactly as it sent it to Google).
 *
 * The signature binds (slug, state) with the instance's own RELAY_SECRET, so one instance
 * cannot route another instance's OAuth callback to itself.
 */

const GOOGLE_AUTH_HOST = 'accounts.google.com';
const encoder = new TextEncoder();

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export async function relaySignature(secret: string, slug: string, state: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${slug}|${state}`));
  return base64Url(new Uint8Array(mac));
}

export interface RelayConfig {
  relayUrl?: string;
  slug?: string;
  secret?: string;
}

export const relayEnabled = (config: RelayConfig): config is Required<RelayConfig> =>
  Boolean(config.relayUrl && config.slug && config.secret);

/** Redirect URI Google should call back for a given relay path, or undefined when the relay is off. */
export const relayRedirectUri = (config: RelayConfig, path: string): string | undefined =>
  relayEnabled(config) ? new URL(path, config.relayUrl).toString() : undefined;

/**
 * Wrap a Google authorization URL in a signed relay `/start` link. Returns the URL unchanged
 * when the relay is off or the URL is not a Google authorization URL with a state.
 */
export async function wrapWithRelay(config: RelayConfig, authorizationUrl: string): Promise<string> {
  if (!relayEnabled(config)) return authorizationUrl;
  let target: URL;
  try {
    target = new URL(authorizationUrl);
  } catch {
    return authorizationUrl;
  }
  const state = target.searchParams.get('state');
  if (target.host !== GOOGLE_AUTH_HOST || !state) return authorizationUrl;

  const start = new URL('/start', config.relayUrl);
  start.searchParams.set('t', config.slug);
  start.searchParams.set('st', state);
  start.searchParams.set('sig', await relaySignature(config.secret, config.slug, state));
  start.searchParams.set('u', authorizationUrl);
  return start.toString();
}
