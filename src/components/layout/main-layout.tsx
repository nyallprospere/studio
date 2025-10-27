import { Header } from './header';
import { Footer } from './footer';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex flex-col bg-background">
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          <Footer />
        </main>
      </div>
  );
}
