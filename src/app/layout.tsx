import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { MainLayout } from '@/components/layout/main-layout';
import { Footer } from '@/components/layout/footer';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'LucianVotes',
  description: 'Track the 2026 St. Lucian General Elections',
  icons: [{ rel: "icon", url: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🗳️</text></svg>" }]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} font-body antialiased`}
        suppressHydrationWarning={true}
      >
        <FirebaseClientProvider>
            <div className="flex min-h-screen flex-col">
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
