'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-4 text-center text-sm text-muted-foreground">
      <Link href="/login" className="hover:underline">
        © 2025 LucianVotes. A REVOLUCIANIZE Co.
      </Link>
    </footer>
  );
}
