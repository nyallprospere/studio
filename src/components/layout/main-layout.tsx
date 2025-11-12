import { Header } from './header';
import { Footer } from './footer';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
      <>
        <Header />
        <div className="flex-1">
            {children}
        </div>
      </>
  );
}
