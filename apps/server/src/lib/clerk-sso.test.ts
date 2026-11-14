import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../env', () => ({ env: {} }));
vi.mock('./services', () => ({ redis: () => ({}) }));

const { verifyClerkSsoToken } = await import('./clerk-sso');

const ISSUER = 'https://clerk.cloudcomputerai.com';
const ORG = 'org_123';
let privateKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' };
  keys = createLocalJWKSet({ keys: [jwk] });
});

const sign = (claims: JWTPayload, opts: { iat?: number; exp?: string; aud?: string; iss?: string } = {}) => {
  const jwt = new SignJWT({ email: 'Ada@Example.com', name: 'Ada', org_id: ORG, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? 'egormail')
    .setJti('jti-1')
    .setIssuedAt(opts.iat)
    .setExpirationTime(opts.exp ?? '60s');
  return jwt.sign(privateKey);
};

const verify = (token: string) => verifyClerkSsoToken(token, { issuer: ISSUER, orgId: ORG, keys });

describe('verifyClerkSsoToken', () => {
  it('accepts a fresh token for this organization', async () => {
    const identity = await verify(await sign({}));
    expect(identity).toEqual({ email: 'ada@example.com', name: 'Ada', image: undefined, jti: 'jti-1' });
  });

  it('rejects a token for another organization', async () => {
    await expect(verify(await sign({ org_id: 'org_other' }))).rejects.toThrow(/different organization/);
  });

  it('rejects the wrong audience or issuer', async () => {
    await expect(verify(await sign({}, { aud: 'something-else' }))).rejects.toThrow();
    await expect(verify(await sign({}, { iss: 'https://evil.example' }))).rejects.toThrow();
  });

  it('rejects tokens older than two minutes even if not expired', async () => {
    const old = Math.floor(Date.now() / 1000) - 600;
    await expect(verify(await sign({}, { iat: old, exp: '1h' }))).rejects.toThrow();
  });

  it('rejects tokens without an email', async () => {
    await expect(verify(await sign({ email: '' }))).rejects.toThrow(/no email/);
  });

  it('rejects tokens signed by an unknown key', async () => {
    const other = await generateKeyPair('RS256');
    const token = await new SignJWT({ email: 'a@b.c', org_id: ORG })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setAudience('egormail')
      .setJti('x')
      .setIssuedAt()
      .setExpirationTime('60s')
      .sign(other.privateKey);
    await expect(verify(token)).rejects.toThrow();
  });
});
