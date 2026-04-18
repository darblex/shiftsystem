import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'מערכת משמרות',
  description: 'לוח ניהול משמרות לצוות',
  applicationName: 'ShiftSystem',
  authors: [{ name: 'ShiftSystem' }],
  keywords: ['משמרות', 'לוח עבודה', 'תורנות', 'ניהול עובדים'],
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f0f13',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent dark/light flash on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('shiftsystem-theme');if(t==='light')document.documentElement.classList.add('light');})()`
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        {children}
      </body>
    </html>
  );
}
