import { Header } from './header';
import { Footer } from './footer';
import { PageViewTracker } from '@/components/page-view-tracker';


export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
    <PageViewTracker />
    <Header />
    <main className="flex-1">
        {children}
    </main>
    <Footer />
    </div>
  );
}
