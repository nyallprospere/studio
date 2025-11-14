
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUser, useAuth, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Election, Party, PartyLogo, Candidate } from '@/lib/types';
import { Vote, ChevronDown, LogIn, LogOut, UserPlus, Star, User, Menu, LineChart, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlpLogo, UwpLogo } from '../icons';
import { Separator } from '../ui/separator';
import Image from 'next/image';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '../ui/sheet';
import { adminNavItems, mainNavItems } from './sidebar-nav';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

export function HeaderNav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { firestore } = useFirebase();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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

  const { uwpLeader, uwpDeputyLeaders, uwpOtherCandidates } = React.useMemo(() => {
    if (!candidates || !uwpParty) return { uwpLeader: null, uwpDeputyLeaders: [], uwpOtherCandidates: [] };
    const allUwp = candidates.filter(c => c.partyId === uwpParty.id);
    const leader = allUwp.find(c => c.isPartyLeader) || null;
    const deputies = allUwp.filter(c => c.isDeputyLeader);
    const others = allUwp.filter(c => !c.isPartyLeader && !c.isDeputyLeader);
    return { uwpLeader: leader, uwpDeputyLeaders: deputies, uwpOtherCandidates: others };
  }, [candidates, uwpParty]);

  const { slpLeader, slpDeputyLeaders, slpOtherCandidates } = React.useMemo(() => {
    if (!candidates || !slpParty) return { slpLeader: null, slpDeputyLeaders: [], slpOtherCandidates: [] };
    const allSlp = candidates.filter(c => c.partyId === slpParty.id);
    const leader = allSlp.find(c => c.isPartyLeader) || null;
    const deputies = allSlp.filter(c => c.isDeputyLeader);
    const others = allSlp.filter(c => !c.isPartyLeader && !c.isDeputyLeader);
    return { slpLeader: leader, slpDeputyLeaders: deputies, slpOtherCandidates: others };
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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                         <AvatarFallback>
                            <User className="h-5 w-5" />
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Admin</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Admin Pages</DropdownMenuLabel>
                    <ScrollArea className="h-[200px]">
                      {adminNavItems.map(link => (
                          <DropdownMenuItem key={link.href} asChild>
                              <Link href={link.href}>{link.label}</Link>
                          </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return null;
  };
  

  const NavLink = ({ href, children, className, onClick }: { href: string; children: React.ReactNode; className?: string; onClick?: () => void; }) => (
    <Link href={href} className={cn("text-sm font-medium transition-colors hover:text-white", pathname === href ? "text-white" : "text-primary-foreground/80", className)} onClick={onClick}>
      {children}
    </Link>
  );
  
  const NavSeparator = () => <Separator orientation="vertical" className="h-6 bg-primary-foreground/20" />;
  
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-x-2 md:gap-x-6">
        <Link href="/" className="flex items-center gap-2 mr-2 md:mr-6">
            <Vote className="w-8 h-8 text-white" />
            <span className="font-bold font-headline text-lg text-white">LucianVotes</span>
        </Link>
         <Button asChild size="sm" className="bg-gradient-to-r from-red-600 to-yellow-400 text-white hover:opacity-90 transition-opacity md:hidden">
            <Link href="/make-your-own">Build Your Map</Link>
        </Button>
        <div className="hidden md:flex items-center gap-x-6">
            <Menubar className="border-none shadow-none bg-transparent p-0 gap-x-6">
            <MenubarMenu>
                <MenubarTrigger className="font-medium text-primary-foreground/80 hover:text-white data-[state=open]:text-white data-[state=open]:bg-primary/80 flex items-center gap-2">
                    {uwpLogo?.logoUrl ? (
                        <Image src={uwpLogo.logoUrl} alt="UWP Logo" width={20} height={20} />
                    ) : (
                        <UwpLogo className="h-5 w-5" />
                    )}
                    UWP
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
                    {uwpDeputyLeaders.map(candidate => (
                        <MenubarItem key={candidate.id} asChild>
                            <Link href={`/candidates/${candidate.id}`}>{candidate.firstName} {candidate.lastName} (Deputy)</Link>
                        </MenubarItem>
                    ))}
                    {uwpOtherCandidates.map(candidate => (
                        <MenubarItem key={candidate.id} asChild>
                            <Link href={`/candidates/${candidate.id}`}>{candidate.firstName} {candidate.lastName}</Link>
                        </MenubarItem>
                    ))}
                </MenubarContent>
            </MenubarMenu>
            
            <NavSeparator />

            <MenubarMenu>
                <MenubarTrigger className="font-medium text-primary-foreground/80 hover:text-white data-[state=open]:text-white data-[state=open]:bg-primary/80 flex items-center gap-2">
                    {slpLogo?.logoUrl ? (
                        <Image src={slpLogo.logoUrl} alt="SLP Logo" width={20} height={20} />
                    ) : (
                        <SlpLogo className="h-5 w-5" />
                    )}
                    SLP
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
                    {slpDeputyLeaders.map(candidate => (
                        <MenubarItem key={candidate.id} asChild>
                            <Link href={`/candidates/${candidate.id}`}>{candidate.firstName} {candidate.lastName} (Deputy)</Link>
                        </MenubarItem>
                    ))}
                    {slpOtherCandidates.map(candidate => (
                        <MenubarItem key={candidate.id} asChild>
                            <Link href={`/candidates/${candidate.id}`}>{candidate.firstName} {candidate.lastName}</Link>
                        </MenubarItem>
                    ))}
                </MenubarContent>
            </MenubarMenu>
            
            <NavSeparator />

            <NavLink href="/election-news">News</NavLink>
            
            <NavSeparator />

            <Button asChild size="sm" className="bg-gradient-to-r from-red-600 to-yellow-400 text-white hover:opacity-90 transition-opacity">
                <Link href="/make-your-own">Build Your Election Map</Link>
            </Button>

            <NavSeparator />

            <MenubarMenu>
                <MenubarTrigger className="font-medium text-primary-foreground/80 hover:text-white data-[state=open]:text-white data-[state=open]:bg-primary/80">
                Analysis <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
                </MenubarTrigger>
                <MenubarContent>
                <MenubarItem asChild>
                    <Link href="/our-projections">Our Projections</Link>
                </MenubarItem>
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
      </div>

      <div className="flex items-center gap-x-2">
        <div className="flex items-center gap-2">
          <AuthNav />
           <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-primary/80">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-primary text-primary-foreground">
                  <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                    <div className="flex flex-col space-y-3">
                        <NavLink href="/election-news" onClick={closeMobileMenu}>News</NavLink>
                    </div>
                    <Separator className="my-4 bg-primary-foreground/20"/>
                     <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="uwp">
                            <AccordionTrigger>UWP</AccordionTrigger>
                            <AccordionContent className="flex flex-col space-y-2 pl-4">
                                <Link href={`/parties/${uwpParty?.id}`} onClick={closeMobileMenu}>UWP Main Page</Link>
                                <Link href={`/events`} onClick={closeMobileMenu}>UWP Events</Link>
                                <Separator className="my-2 bg-primary-foreground/20"/>
                                <p className="font-semibold text-sm">Candidates</p>
                                {uwpLeader && (
                                    <Link href={`/candidates/${uwpLeader.id}`} onClick={closeMobileMenu} className="flex items-center justify-between text-sm">
                                        {uwpLeader.firstName} {uwpLeader.lastName}
                                        <Star className="h-4 w-4 text-accent" />
                                    </Link>
                                )}
                                {uwpDeputyLeaders.map(c => (
                                     <Link key={c.id} href={`/candidates/${c.id}`} onClick={closeMobileMenu} className="text-sm">{c.firstName} {c.lastName} (Deputy)</Link>
                                ))}
                                {uwpOtherCandidates.map(c => (
                                     <Link key={c.id} href={`/candidates/${c.id}`} onClick={closeMobileMenu} className="text-sm">{c.firstName} {c.lastName}</Link>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="slp">
                            <AccordionTrigger>SLP</AccordionTrigger>
                            <AccordionContent className="flex flex-col space-y-2 pl-4">
                                <Link href={`/parties/${slpParty?.id}`} onClick={closeMobileMenu}>SLP Main Page</Link>
                                <Link href={`/events-2`} onClick={closeMobileMenu}>SLP Events</Link>
                                 <Separator className="my-2 bg-primary-foreground/20"/>
                                <p className="font-semibold text-sm">Candidates</p>
                                {slpLeader && (
                                    <Link href={`/candidates/${slpLeader.id}`} onClick={closeMobileMenu} className="flex items-center justify-between text-sm">
                                        {slpLeader.firstName} {slpLeader.lastName}
                                        <Star className="h-4 w-4 text-accent" />
                                    </Link>
                                )}
                                {slpDeputyLeaders.map(c => (
                                    <Link key={c.id} href={`/candidates/${c.id}`} onClick={closeMobileMenu} className="text-sm">{c.firstName} {c.lastName} (Deputy)</Link>
                                ))}
                                {slpOtherCandidates.map(c => (
                                     <Link key={c.id} href={`/candidates/${c.id}`} onClick={closeMobileMenu} className="text-sm">{c.firstName} {c.lastName}</Link>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="analysis">
                            <AccordionTrigger>Analysis</AccordionTrigger>
                            <AccordionContent className="flex flex-col space-y-2 pl-4">
                               <Link href="/our-projections" onClick={closeMobileMenu}>Our Projections</Link>
                               <Link href="/historical-trends" onClick={closeMobileMenu}>Historical Trends</Link>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="results">
                            <AccordionTrigger>Past Results</AccordionTrigger>
                            <AccordionContent className="flex flex-col space-y-2 pl-4">
                                {sortedElections.map(election => (
                                    <Link key={election.id} href={`/results?year=${election.id}`} onClick={closeMobileMenu}>
                                        {election.name.replace('General ', '')}
                                    </Link>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                     </Accordion>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
        </div>
      </div>
    </div>
  );
}

    

    