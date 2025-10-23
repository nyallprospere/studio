'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { FirebaseClientProvider } from '@/firebase';
import { usePathname } from 'next/navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <FirebaseClientProvider>
      {isAuthPage ? children : <MainLayout>{children}</MainLayout>}
    </FirebaseClientProvider>
  );
}
