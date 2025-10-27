'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Footer } from '@/components/layout/footer';
import { FirebaseClientProvider } from '@/firebase';
import { usePathname } from 'next/navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <FirebaseClientProvider>
      {isAuthPage ? (
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow flex items-center justify-center">{children}</main>
          <Footer />
        </div>
        ) : (
        <MainLayout>{children}</MainLayout>
        )
      }
    </FirebaseClientProvider>
  );
}
