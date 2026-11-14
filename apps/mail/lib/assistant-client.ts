import { redirect } from 'react-router';
import { BACKEND_URL } from '@/lib/runtime-urls';

export async function assistantRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}/api/assistant${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (response.status === 401) {
    const returnTo = window.location.pathname + window.location.search;
    throw redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Assistant request failed');
  return body as T;
}
