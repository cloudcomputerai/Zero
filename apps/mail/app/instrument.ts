import * as Sentry from '@sentry/react';
import { BACKEND_URL } from '@/lib/runtime-urls';

// Error reporting is opt-in per deployment: set VITE_PUBLIC_SENTRY_DSN to your own Sentry
// project at build time. Without it nothing is sent anywhere (captureException is a no-op).
// Session replay stays off: it would record users' mailboxes.
const dsn = import.meta.env.VITE_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tunnel: BACKEND_URL + '/monitoring/sentry',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    debug: false,
  });
}
