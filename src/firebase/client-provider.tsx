'use client';

import { FirebaseProvider } from './provider';
import { ReactNode } from 'react';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
