import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Header } from './header';
import { Footer } from './footer';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 flex flex-col bg-background">
          <Header />
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
