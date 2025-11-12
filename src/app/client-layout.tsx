'use client';

import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Footer } from '@/components/layout/footer';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { usePathname } from 'next/navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per application instance.
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {isAuthPage ? (
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow flex items-center justify-center">{children}</main>
          <Footer />
        </div>
      ) : (
        <MainLayout>{children}</MainLayout>
      )}
    </FirebaseProvider>
  );
}
