import { describe, expect, it } from 'vitest';
import { relayRedirectUri, relaySignature, wrapWithRelay } from './auth-relay';

const config = { relayUrl: 'https://auth.email.egorai.com', slug: 'acme', secret: 's3cret' };
const google =
  'https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=abc123&redirect_uri=https%3A%2F%2Fauth.email.egorai.com%2Fcallback%2Fgoogle';

describe('auth relay', () => {
  it('leaves URLs alone when the relay is not configured', async () => {
    expect(await wrapWithRelay({}, google)).toBe(google);
    expect(await wrapWithRelay({ ...config, secret: undefined }, google)).toBe(google);
    expect(relayRedirectUri({}, '/callback/google')).toBeUndefined();
  });

  it('builds the shared redirect URI', () => {
    expect(relayRedirectUri(config, '/callback/google')).toBe(
      'https://auth.email.egorai.com/callback/google',
    );
  });

  it('wraps a Google authorization URL in a signed /start link', async () => {
    const wrapped = new URL(await wrapWithRelay(config, google));
    expect(wrapped.origin + wrapped.pathname).toBe('https://auth.email.egorai.com/start');
    expect(wrapped.searchParams.get('t')).toBe('acme');
    expect(wrapped.searchParams.get('st')).toBe('abc123');
    expect(wrapped.searchParams.get('u')).toBe(google);
    expect(wrapped.searchParams.get('sig')).toBe(await relaySignature('s3cret', 'acme', 'abc123'));
  });

  it('does not wrap non-Google or state-less URLs', async () => {
    const other = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?state=abc';
    expect(await wrapWithRelay(config, other)).toBe(other);
    const noState = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x';
    expect(await wrapWithRelay(config, noState)).toBe(noState);
  });

  it('binds the signature to both tenant and state', async () => {
    const base = await relaySignature('s3cret', 'acme', 'abc123');
    expect(await relaySignature('s3cret', 'other', 'abc123')).not.toBe(base);
    expect(await relaySignature('s3cret', 'acme', 'abc124')).not.toBe(base);
    expect(await relaySignature('different', 'acme', 'abc123')).not.toBe(base);
  });
});
