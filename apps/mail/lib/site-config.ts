const TITLE = 'EgorMail';
const DESCRIPTION =
  'EgorMail is an AI-powered inbox that runs on your own private cloud computer. Your mail, your machine, your data.';

export const siteConfig = {
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: '/favicon.ico',
  },
  applicationName: 'EgorMail',
  creator: 'CloudComputerAI',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${import.meta.env.VITE_PUBLIC_APP_URL}/og.png`,
        width: 512,
        height: 512,
        alt: TITLE,
      },
    ],
  },
  category: 'Email Client',
  alternates: {
    canonical: import.meta.env.VITE_PUBLIC_APP_URL,
  },
  keywords: [
    'Mail',
    'Email',
    'Open Source',
    'Email Client',
    'Gmail Alternative',
    'Webmail',
    'Secure Email',
    'Email Management',
    'Email Platform',
    'Communication Tool',
    'Productivity',
    'Business Email',
    'Personal Email',
    'Mail Server',
    'Email Software',
    'Collaboration',
    'Message Management',
    'Digital Communication',
    'Email Service',
    'Web Application',
  ],
  //   metadataBase: new URL(import.meta.env.VITE_PUBLIC_APP_URL!),
};
