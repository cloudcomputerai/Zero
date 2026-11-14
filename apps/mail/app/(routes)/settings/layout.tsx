import { SettingsLayoutContent } from '@/components/ui/settings-content';
import { authProxy } from '@/lib/auth-proxy';
import type { Route } from './+types/layout';
import { Outlet } from 'react-router';
import { APP_URL } from '@/lib/runtime-urls';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await authProxy.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.redirect(`${APP_URL}/login`);
  }

  return null;
}

export default function SettingsLayout() {
  return (
    <SettingsLayoutContent>
      <Outlet />
    </SettingsLayoutContent>
  );
}
