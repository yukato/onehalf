import type { Metadata, Viewport } from 'next';
import { BugsnagProvider } from '@/components/providers/BugsnagProvider';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://support.bachelorapp.net';
const ogImage = '/og-image.png';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ONEHALF',
  description: 'ONEHALF',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: 'ONEHALF',
    description: 'ONEHALF',
    url: siteUrl,
    siteName: 'ONEHALF',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'ONEHALF',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ONEHALF',
    description: 'ONEHALF',
    images: [ogImage],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">
        <BugsnagProvider>{children}</BugsnagProvider>
      </body>
    </html>
  );
}
