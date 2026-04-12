import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'מערכת משמרות',
  description: 'ניהול לוח עבודה ומשמרות',
  applicationName: 'ShiftSystem',
  authors: [{ name: 'ShiftSystem' }],
  keywords: ['משמרות', 'לוח עבודה', 'עבודה מהבית', 'תורנות'],
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1e' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-app text-app-fg min-h-screen selection:bg-primary/20">
        {children}
      </body>
    </html>
  );
}
