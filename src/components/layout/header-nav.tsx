'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { Button } from '@/components/ui/button';
import { useUser, useAuth, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Election, Party } from '@/lib/types';
import { Vote, ChevronDown, LogIn, LogOut, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlpLogo, UwpLogo } from '../icons';

export function HeaderNav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { firestore } = useFirebase();

  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const { data: elections } = useCollection<Election>(electionsQuery);

  const partiesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'parties') : null), [firestore]);
  const { data: parties } = useCollection<Party>(partiesQuery);

  const uwpParty = React.useMemo(() => parties?.find(p => p.acronym === 'UWP'), [parties]);
  const slpParty = React.useMemo(() => parties?.find(p => p.acronym === 'SLP'), [parties]);

  const sortedElections = React.useMemo(() => {
    if (!elections) return [];
    return elections
      .filter(election => election.year !== 1974 && !election.isCurrent)
      .sort((a, b) => b.year - a.year);
  }, [elections]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const AuthNav = () => {
    if (isUserLoading) return null;
    if (user) {
      return (
        <Button onClick={handleLogout} variant="ghost">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      );
    }
    return (
      <>
        <Button asChild variant="ghost">
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Link>
        </Button>
        <Button asChild>
          <Link href="/signup">
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up
          </Link>
        </Button>
      </>
    );
  };
  
  const adminLinks = [
    { href: '/admin/elections', label: 'Manage Elections' },
    { href: '/admin/parties', label: 'Manage Parties' },
    { href: '/admin/logos', label: 'Manage Logos' },
    { href: '/admin/events', label: 'Manage Events' },
    { href: '/admin/results', label: 'Manage Election Results' },
    { href: '/admin/constituencies', label: 'Manage Projection Map' },
    { href: '/admin/regions', label: 'Manage Regions' },
    { href: '/admin/candidates', label: 'Manage Candidates' },
    { href: '/admin/news', label: 'Manage News' },
    { href: '/admin/mailing-list', label: 'Manage Mailing List' },
    { href: '/admin/ads', label: 'Manage Ads' },
    { href: '/admin/map-submissions', label: 'Map Submissions' },
    { href: '/admin/ai-analyzer', label: 'AI Analyzer' },
    { href: '/admin/settings', label: 'Manage Settings' },
  ];

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
            <Vote className="w-8 h-8 text-primary" />
            <span className="font-bold font-headline text-lg">LucianVotes</span>
        </Link>
        <Menubar className="border-none shadow-none bg-transparent">
          <MenubarMenu>
            <Link href="/" className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/" ? "" : "text-muted-foreground")}>
              Home
            </Link>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="font-medium">
              Parties <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
            </MenubarTrigger>
            <MenubarContent>
              {uwpParty && <MenubarItem asChild><Link href={`/parties/${uwpParty.id}`}><UwpLogo className="mr-2 h-4 w-4" />UWP</Link></MenubarItem>}
              {slpParty && <MenubarItem asChild><Link href={`/parties/${slpParty.id}`}><SlpLogo className="mr-2 h-4 w-4" />SLP</Link></MenubarItem>}
            </MenubarContent>
          </MenubarMenu>
          
          <MenubarMenu>
             <Link href="/election-news" className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/election-news" ? "" : "text-muted-foreground")}>
              Election News
            </Link>
          </MenubarMenu>

          <MenubarMenu>
             <Link href="/make-your-own" className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/make-your-own" ? "" : "text-muted-foreground")}>
              Build Your Election Map
            </Link>
          </MenubarMenu>
          
          <MenubarMenu>
            <MenubarTrigger className="font-medium">
              Past Results <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
            </MenubarTrigger>
            <MenubarContent>
                <MenubarItem asChild><Link href="/historical-trends">Historical Trends</Link></MenubarItem>
                <MenubarSeparator />
                {sortedElections.map(election => (
                    <MenubarItem key={election.id} asChild>
                        <Link href={`/results?year=${election.id}`}>
                            {election.name.replace('General ', '')}
                        </Link>
                    </MenubarItem>
                ))}
            </MenubarContent>
          </MenubarMenu>
          
          {user && (
            <MenubarMenu>
                <MenubarTrigger className="font-medium">
                    Admin <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
                </MenubarTrigger>
                <MenubarContent>
                    {adminLinks.map(link => (
                        <MenubarItem key={link.href} asChild>
                            <Link href={link.href}>{link.label}</Link>
                        </MenubarItem>
                    ))}
                </MenubarContent>
            </MenubarMenu>
          )}

        </Menubar>
      </div>
      <div className="flex items-center gap-2">
        <AuthNav />
      </div>
    </div>
  );
}
