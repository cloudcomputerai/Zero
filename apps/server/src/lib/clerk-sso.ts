/**
 * Single sign-on from the CloudComputerAI dashboard (Clerk) into an EgorMail instance.
 *
 * The dashboard mints a short-lived token from the Clerk JWT template `egormail`
 * (claims: aud=egormail, email, name, image, org_id, jti) and redirects the browser to
 *   GET /api/auth/sso/clerk?token=<jwt>
 * The instance verifies it against Clerk's JWKS, checks the token belongs to the Clerk
 * organization that owns this instance, finds or creates the user, and starts a normal
 * better-auth session (same cookie as any other sign-in).
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';
import { getContext } from 'hono/context-storage';
import type { HonoContext } from '../ctx';
import { redis } from './services';
import { env } from '../env';
import { z } from 'zod';

export const SSO_AUDIENCE = 'egormail';
const MAX_TOKEN_AGE = '120s';

export interface SsoIdentity {
  email: string;
  name: string;
  image?: string;
  jti: string;
}

export interface SsoVerifyOptions {
  issuer: string;
  orgId: string;
  keys: JWTVerifyGetKey;
}

/** Verify a Clerk `egormail` token for this instance. Throws on any mismatch. */
export async function verifyClerkSsoToken(token: string, opts: SsoVerifyOptions): Promise<SsoIdentity> {
  const { payload } = await jwtVerify(token, opts.keys, {
    issuer: opts.issuer,
    audience: SSO_AUDIENCE,
    maxTokenAge: MAX_TOKEN_AGE,
    algorithms: ['RS256'],
  });
  if (payload.org_id !== opts.orgId) throw new Error('Token is for a different organization');
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) throw new Error('Token has no email');
  if (typeof payload.jti !== 'string' || !payload.jti) throw new Error('Token has no jti');
  return {
    email,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : email,
    image: typeof payload.image === 'string' && payload.image ? payload.image : undefined,
    jti: payload.jti,
  };
}

let cachedKeys: { issuer: string; keys: JWTVerifyGetKey } | null = null;
const clerkKeys = (issuer: string) => {
  if (cachedKeys?.issuer !== issuer) {
    cachedKeys = { issuer, keys: createRemoteJWKSet(new URL('/.well-known/jwks.json', issuer)) };
  }
  return cachedKeys.keys;
};

export const clerkSso = () =>
  ({
    id: 'clerk-sso',
    endpoints: {
      clerkSso: createAuthEndpoint(
        '/sso/clerk',
        { method: 'GET', query: z.object({ token: z.string().min(1) }) },
        async (ctx) => {
          const appUrl = env.VITE_PUBLIC_APP_URL;
          if (!env.CLERK_ISSUER || !env.INSTANCE_ORG_ID) {
            throw new APIError('NOT_FOUND', { message: 'SSO is not configured' });
          }

          let identity: SsoIdentity;
          try {
            identity = await verifyClerkSsoToken(ctx.query.token, {
              issuer: env.CLERK_ISSUER,
              orgId: env.INSTANCE_ORG_ID,
              keys: clerkKeys(env.CLERK_ISSUER),
            });
          } catch (error) {
            console.warn('Rejected SSO token', error instanceof Error ? error.message : error);
            throw ctx.redirect(`${appUrl}/login?error=sso_invalid`);
          }

          // One-time use: a token cannot be replayed within its lifetime.
          const fresh = await redis().set(`sso-jti:${identity.jti}`, '1', { nx: true, ex: 300 });
          if (fresh !== 'OK') throw ctx.redirect(`${appUrl}/login?error=sso_replayed`);

          const adapter = ctx.context.internalAdapter;
          let user = (await adapter.findUserByEmail(identity.email))?.user;
          if (!user) {
            getContext<HonoContext>().set('ssoSignup', true);
            user = await adapter.createUser(
              {
                email: identity.email,
                name: identity.name,
                image: identity.image,
                emailVerified: true,
              },
              ctx,
            );
          }
          if (!user) throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Could not create user' });

          const session = await adapter.createSession(user.id, ctx);
          if (!session) {
            throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Could not create session' });
          }
          await setSessionCookie(ctx, { session, user });
          throw ctx.redirect(`${appUrl}/mail/inbox`);
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
