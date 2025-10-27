
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
        <Button onClick={handleLogout} variant="ghost" className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      );
    }
    return (
      <>
        <Button asChild variant="ghost" className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Link>
        </Button>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
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

  const NavLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <Link href={href} className={cn("text-sm font-medium transition-colors hover:text-white", pathname === href ? "text-white" : "text-primary-foreground/80", className)}>
      {children}
    </Link>
  );

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-x-12">
        <Link href="/" className="flex items-center gap-2 mr-6">
            <Vote className="w-8 h-8 text-white" />
            <span className="font-bold font-headline text-lg text-white">LucianVotes</span>
        </Link>
        <Menubar className="border-none shadow-none bg-transparent p-0">
          <MenubarMenu>
            <NavLink href="/">Home</NavLink>
          </MenubarMenu>

          {uwpParty && (
            <MenubarMenu>
               <NavLink href={`/parties/${uwpParty.id}`} className="flex items-center gap-2">
                <UwpLogo className="h-4 w-4" />
                UWP
              </NavLink>
            </MenubarMenu>
          )}

          {slpParty && (
             <MenubarMenu>
               <NavLink href={`/parties/${slpParty.id}`} className="flex items-center gap-2">
                <SlpLogo className="h-4 w-4" />
                SLP
              </NavLink>
            </MenubarMenu>
          )}
          
          <MenubarMenu>
             <NavLink href="/election-news">Election News</NavLink>
          </MenubarMenu>

          <MenubarMenu>
             <NavLink href="/make-your-own">Build Your Election Map</NavLink>
          </MenubarMenu>
          
           <MenubarMenu>
             <NavLink href="/historical-trends">Historical Trends</NavLink>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="font-medium text-primary-foreground/80 hover:text-white data-[state=open]:text-white data-[state=open]:bg-primary/80">
              Past Results <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
            </MenubarTrigger>
            <MenubarContent>
                {sortedElections.map(election => (
                    <MenubarItem key={election.id} asChild>
                        <Link href={`/results?year=${election.id}`}>
                            {election.name.replace('General ', '')}
                        </Link>
                    </MenubarItem>
                ))}
            </MenubarContent>
          </MenubarMenu>
          
        </Menubar>
      </div>
      <div className="flex items-center gap-2">
         {user && (
            <Menubar className="border-none shadow-none bg-transparent p-0">
                <MenubarMenu>
                    <MenubarTrigger className="font-medium text-primary-foreground/80 hover:text-white data-[state=open]:text-white data-[state=open]:bg-primary/80">
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
            </Menubar>
          )}
        <AuthNav />
      </div>
    </div>
  );
}
