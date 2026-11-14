import { LoginClient, type Provider } from './login-client';
import { useLoaderData } from 'react-router';
import { BACKEND_URL } from '@/lib/runtime-urls';

export async function clientLoader() {
  const isProd = !import.meta.env.DEV;

  const response = await fetch(BACKEND_URL + '/api/public/providers');
  const data = (await response.json()) as { allProviders: Provider[] };

  return {
    allProviders: data.allProviders,
    isProd,
  };
}

export default function LoginPage() {
  const { allProviders, isProd } = useLoaderData<typeof clientLoader>();

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0F0F0F]">
      <LoginClient providers={allProviders} isProd={isProd} />
    </div>
  );
}
