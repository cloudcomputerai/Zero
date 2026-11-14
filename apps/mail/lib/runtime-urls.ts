/**
 * App and backend URLs resolved at runtime, so one frontend build can serve every
 * EgorMail instance (`<slug>.email.egorai.com` talks to `api.<slug>.email.egorai.com`).
 *
 * The build-time VITE_PUBLIC_* values still win when the page is served from the host
 * they were built for (the owner instance, localhost dev) and outside the browser
 * (prerendering), so existing single-instance deploys behave exactly as before.
 */
const builtApp = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) || '';
const builtBackend = (import.meta.env.VITE_PUBLIC_BACKEND_URL as string | undefined) || '';

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

export function resolveUrls(origin: string | undefined) {
  if (!origin) return { app: builtApp, backend: builtBackend };
  const { protocol, host } = new URL(origin);
  if (builtBackend && (!builtApp || hostOf(builtApp) === host)) {
    return { app: origin, backend: builtBackend };
  }
  return { app: origin, backend: `${protocol}//api.${host}` };
}

const resolved = resolveUrls(typeof window !== 'undefined' ? window.location.origin : undefined);

export const APP_URL = resolved.app;
export const BACKEND_URL = resolved.backend;
