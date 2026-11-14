import { QueryProvider } from './query-provider';
import { AutumnProvider } from 'autumn-js/react';
import type { PropsWithChildren } from 'react';
import { BACKEND_URL } from '@/lib/runtime-urls';

export function ServerProviders({
  children,
  connectionId,
}: PropsWithChildren<{ connectionId: string | null }>) {
  return (
    <AutumnProvider backendUrl={BACKEND_URL}>
      <QueryProvider connectionId={connectionId}>{children}</QueryProvider>
    </AutumnProvider>
  );
}
