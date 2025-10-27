
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
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Election, Party, PartyLogo, Candidate } from '@/lib/types';
import { Vote, ChevronDown, LogIn, LogOut, UserPlus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlpLogo, UwpLogo } from '../icons';
import { Separator } from '../ui/separator';
import Image from 'next/image';

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
  
  const partyLogosQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'party_logos') : null), [firestore]);
  const { data: partyLogos } = useCollection<PartyLogo>(partyLogosQuery);
  
  const candidatesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'candidates') : null), [firestore]);
  const { data: candidates } = useCollection<Candidate>(candidatesQuery);

  const uwpParty = React.useMemo(() => parties?.find(p => p.acronym === 'UWP'), [parties]);
  const slpParty = React.useMemo(() => parties?.find(p => p.acronym === 'SLP'), [parties]);
  
  const election2026 = React.useMemo(() => elections?.find(e => e.isCurrent), [elections]);

  const uwpLogo = React.useMemo(() => {
    if (!uwpParty || !election2026 || !partyLogos) return null;
    return partyLogos.find(logo => logo.partyId === uwpParty.id && logo.electionId === election2026.id);
  }, [partyLogos, uwpParty, election2026]);

  const slpLogo = React.useMemo(() => {
    if (!slpParty || !election2026 || !partyLogos) return null;
    return partyLogos.find(logo => logo.partyId === slpParty.id && logo.electionId === election2026.id);
  }, [partyLogos, slpParty, election2026]);

  const { uwpLeader, uwpOtherCandidates } = React.useMemo(() => {
    if (!candidates || !uwpParty) return { uwpLeader: null, uwpOtherCandidates: [] };
    const allUwp = candidates.filter(c => c.partyId === uwpParty.id);
    const leader = allUwp.find(c => c.isPartyLeader) || null;
    const others = allUwp.filter(c => !c.isPartyLeader);
    return { uwpLeader: leader, uwpOtherCandidates: others };
  }, [candidates, uwpParty]);

  const { slpLeader, slpOtherCandidates } = React.useMemo(() => {
    if (!candidates || !slpParty) return { slpLeader: null, slpOtherCandidates: [] };
    const allSlp = candidates.filter(c => c.partyId === slpParty.id);
    const leader = allSlp.find(c => c.isPartyLeader) || null;
    const others = allSlp.filter(c => !c.isPartyLeader);
    return { slpLeader: leader, slpOtherCandidates: others };
  }, [candidates, slpParty]);


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
        <div className="flex items-center gap-4">
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
          <Button onClick={handleLogout} variant="ghost" className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
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
  
  const NavSeparator = () => <Separator orientation="vertical" className="h-6 bg-primary-foreground/20" />;

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-x-6">
        <Link href="/" className="flex items-center gap-2 mr-6">
            <Vote className="w-8 h-8 text-white" />
            <span className="font-bold font-headline text-lg text-white">LucianVotes</span>
        </Link>
        <Menubar className="border-none shadow-none bg-transparent p-0 gap-x-6">
          
          <MenubarMenu>
            <MenubarTrigger asChild>
                <NavLink href={`/parties/${uwpParty?.id}`} className="flex items-center gap-2">
                    {uwpLogo?.logoUrl ? (
                        <Image src={uwpLogo.logoUrl} alt="UWP Logo" width={20} height={20} />
                    ) : (
                        <UwpLogo className="h-5 w-5" />
                    )}
                    UWP
                </NavLink>
            </MenubarTrigger>
            <MenubarContent>
                <MenubarItem asChild>
                    <Link href={`/parties/${uwpParty?.id}`}>UWP Main Page</Link>
                </MenubarItem>
                 <MenubarItem asChild>
                    <Link href={`/events`}>UWP Events</Link>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem disabled>2026 Slate of Candidates</MenubarItem>
                {uwpLeader && (
                    <MenubarItem key={uwpLeader.id} asChild>
                        <Link href={`/candidates/${uwpLeader.id}`} className="flex items-center justify-between">
                            {uwpLeader.firstName} {uwpLeader.lastName}
                            <Star className="h-4 w-4 text-accent" />
                        </Link>
                    </MenubarItem>
                )}
                {uwpOtherCandidates.map(candidate => (
                    <MenubarItem key={candidate.id} asChild>
                        <Link href={`/candidates/${candidate.id}`}>{candidate.firstName} {candidate.lastName}</Link>
                    </MenubarItem>
                ))}
            </MenubarContent>
          </MenubarMenu>
          
          <NavSeparator />

          <MenubarMenu>
             <MenubarTrigger asChild>
                <NavLink href={`/parties/${slpParty?.id}`} className="flex items-center gap-2">
                    {slpLogo?.logoUrl ? (
                        <Image src={slpLogo.logoUrl} alt="SLP Logo" width={20} height={20} />
                    ) : (
                        <SlpLogo className="h-5 w-5" />
                    )}
                    SLP
                </NavLink>
              </MenubarTrigger>
            <MenubarContent>
                 <MenubarItem asChild>
                    <Link href={`/parties/${slpParty?.id}`}>SLP Main Page</Link>
                </MenubarItem>
                 <MenubarItem asChild>
                    <Link href={`/events-2`}>SLP Events</Link>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem disabled>2026 Slate of Candidates</MenubarItem>
                {slpLeader && (
                    <MenubarItem key={slpLeader.id} asChild>
                        <Link href={`/candidates/${slpLeader.id}`} className="flex items-center justify-between">
                            {slpLeader.firstName} {slpLeader.lastName}
                             <Star className="h-4 w-4 text-accent" />
                        </Link>
                    </MenubarItem>
                )}
                {slpOtherCandidates.map(candidate => (
                    <MenubarItem key={candidate.id} asChild>
                        <Link href={`/candidates/${candidate.id}`}>{candidate.firstName} {candidate.lastName}</Link>
                    </MenubarItem>
                ))}
            </MenubarContent>
          </MenubarMenu>
          
          <NavSeparator />

          <MenubarMenu>
             <NavLink href="/election-news">News</NavLink>
          </MenubarMenu>

          <NavSeparator />

           <MenubarMenu>
            <MenubarTrigger className="font-medium text-primary-foreground/80 hover:text-white data-[state=open]:text-white data-[state=open]:bg-primary/80">
              Analysis <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem asChild>
                <Link href="/historical-trends">Historical Trends</Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          
          <NavSeparator />

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

       <div className="flex items-center gap-x-6">
         <Menubar className="border-none shadow-none bg-transparent p-0">
             <MenubarMenu>
              <Button asChild size="sm" className="bg-gradient-to-r from-red-600 to-yellow-400 text-white hover:opacity-90 transition-opacity">
                  <Link href="/make-your-own">Build Your Election Map</Link>
              </Button>
            </MenubarMenu>
         </Menubar>
        <div className="flex items-center gap-2">
          <AuthNav />
        </div>
      </div>
    </div>
  );
}
