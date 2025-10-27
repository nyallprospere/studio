import { HeaderNav } from './header-nav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-primary shadow-md">
        <div className="container flex h-14 items-center">
            <HeaderNav />
        </div>
    </header>
  );
}
