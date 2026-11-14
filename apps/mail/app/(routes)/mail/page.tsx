import { APP_URL } from '@/lib/runtime-urls';
export function clientLoader() {
  return Response.redirect(`${APP_URL}/mail/inbox`);
}
