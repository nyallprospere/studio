

'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarContent,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Vote, Home, Users, BarChart3, TrendingUp, Landmark, Map, Settings, Shield, LogIn, LogOut, UserPlus, FilePlus, Calendar, Pencil } from 'lucide-react';
import { Button } from '../ui/button';
import { useUser, useAuth, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Election, Party, Candidate } from '@/lib/types';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { SlpLogo, UwpLogo } from '../icons';
import { ScrollArea } from '../ui/scroll-area';


const mainNavItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/polls', icon: BarChart3, label: 'Polls' },
  { href: '/predictions', icon: TrendingUp, label: 'Predictions' },
  { href: '/constituencies', icon: Map, label: 'Constituencies' },
  { href: '/districts', icon: Map, label: 'Districts' },
  { href: '/make-your-own', icon: Pencil, label: 'Make Your Own' },
];

const adminNavItems = [
    { href: '/admin/elections', icon: Vote, label: 'Manage Elections' },
    { href: '/admin/parties', icon: Shield, label: 'Manage Parties' },
    { href: '/admin/candidates', icon: Users, label: 'Manage Candidates' },
    { href: '/admin/events', icon: Calendar, label: 'Manage Events'},
    { href: '/admin/results', icon: Landmark, label: 'Manage Election Results' },
    { href: '/admin/constituencies', icon: FilePlus, label: 'Manage Constituencies' },
    { href: '/admin/map', icon: Map, label: 'Manage Map' },
    { href: '/admin/settings', icon: Settings, label: 'Manage Settings' },
];

function AuthSection() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    if (isUserLoading) {
        return null; // Don't show anything while loading
    }
    
    if (user) {
         return (
             <SidebarMenuItem>
                <Button
                    onClick={handleLogout}
                    variant='ghost'
                    className="w-full justify-start"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </SidebarMenuItem>
         );
    }

    return (
        <>
            <SidebarMenuItem>
                <Button
                asChild
                variant='ghost'
                className="w-full justify-start"
                >
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                </Link>
                </Button>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Button
                    asChild
                    variant='ghost'
                    className="w-full justify-start"
                >
                    <Link href="/signup">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Sign Up
                    </Link>
                </Button>
            </SidebarMenuItem>
        </>
    );
}


export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { firestore } = useFirebase();
  
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isUwpOpen, setIsUwpOpen] = useState(false);
  const [isSlpOpen, setIsSlpOpen] = useState(false);
  const [isUwpCandidatesOpen, setIsUwpCandidatesOpen] = useState(false);
  const [isSlpCandidatesOpen, setIsSlpCandidatesOpen] = useState(false);

  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);

  const partiesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'parties') : null), [firestore]);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

  const uwpParty = useMemo(() => parties?.find(p => p.acronym === 'UWP'), [parties]);
  const slpParty = useMemo(() => parties?.find(p => p.acronym === 'SLP'), [parties]);
  
  const uwpCandidatesQuery = useMemoFirebase(() => (firestore && uwpParty) ? query(collection(firestore, 'candidates'), where('partyId', '==', uwpParty.id)) : null, [firestore, uwpParty]);
  const { data: uwpCandidates, isLoading: loadingUwpCandidates } = useCollection<Candidate>(uwpCandidatesQuery);

  const slpCandidatesQuery = useMemoFirebase(() => (firestore && slpParty) ? query(collection(firestore, 'candidates'), where('partyId', '==', slpParty.id)) : null, [firestore, slpParty]);
  const { data: slpCandidates, isLoading: loadingSlpCandidates } = useCollection<Candidate>(slpCandidatesQuery);


  const sortedElections = useMemo(() => {
    if (!elections) return [];
    return [...elections].sort((a, b) => {
        if (a.year !== b.year) {
            return b.year - a.year;
        }
        return b.name.localeCompare(a.name);
    });
  }, [elections]);

  const sortedUwpCandidates = useMemo(() => uwpCandidates ? [...uwpCandidates].sort((a,b) => a.lastName.localeCompare(b.lastName)) : [], [uwpCandidates]);
  const sortedSlpCandidates = useMemo(() => slpCandidates ? [...slpCandidates].sort((a,b) => a.lastName.localeCompare(b.lastName)) : [], [slpCandidates]);

  useEffect(() => {
    setIsResultsOpen(pathname.startsWith('/results'));
    
    const isUwpRelated = uwpParty && (
        pathname.startsWith(`/parties/${uwpParty.id}`) || 
        pathname.startsWith('/events') ||
        (uwpCandidates?.some(c => pathname.startsWith(`/candidates/${c.id}`)) ?? false)
    );
    const isSlpRelated = slpParty && (
        pathname.startsWith(`/parties/${slpParty.id}`) || 
        pathname.startsWith('/events-2') ||
        (slpCandidates?.some(c => pathname.startsWith(`/candidates/${c.id}`)) ?? false)
    );

    setIsUwpOpen(!!isUwpRelated);
    setIsSlpOpen(!!isSlpRelated);
    
    setIsUwpCandidatesOpen(uwpCandidates?.some(c => pathname.startsWith(`/candidates/${c.id}`)) ?? false);
    setIsSlpCandidatesOpen(slpCandidates?.some(c => pathname.startsWith(`/candidates/${c.id}`)) ?? false);

  }, [pathname, uwpParty, slpParty, uwpCandidates, slpCandidates]);

  
  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 p-2">
            <Vote className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
                <h2 className="text-lg font-headline font-semibold">
                    LucianVotes
                </h2>
                <p className="text-xs text-muted-foreground">2026 Hub</p>
            </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Button
                asChild
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className="w-full justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            </SidebarMenuItem>
          ))}

          <SidebarMenuItem>
              <Collapsible open={isResultsOpen} onOpenChange={setIsResultsOpen}>
                  <CollapsibleTrigger asChild>
                      <Button variant={pathname.startsWith('/results') ? 'secondary' : 'ghost'} className="w-full justify-between">
                          <div className="flex items-center gap-2">
                              <Landmark className="mr-2 h-4 w-4" />
                              Past Results
                          </div>
                          <ChevronRight className={`h-4 w-4 transition-transform ${isResultsOpen ? 'rotate-90' : ''}`} />
                      </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-64">
                      <SidebarMenuSub>
                          {loadingElections ? <p className="p-2 text-xs text-muted-foreground">Loading years...</p> : sortedElections.map(election => (
                              <SidebarMenuItem key={election.id}>
                                  <SidebarMenuSubButton asChild isActive={pathname.includes(`year=${election.id}`)}>
                                      <Link href={`/results?year=${election.id}`}>
                                          {election.name.replace('General ', '')}
                                      </Link>
                                  </SidebarMenuSubButton>
                              </SidebarMenuItem>
                          ))}
                      </SidebarMenuSub>
                    </ScrollArea>
                  </CollapsibleContent>
              </Collapsible>
          </SidebarMenuItem>
          
          {uwpParty && (
              <SidebarMenuItem>
                  <Collapsible open={isUwpOpen} onOpenChange={setIsUwpOpen}>
                      <CollapsibleTrigger asChild>
                          <Button variant={isUwpOpen ? 'secondary' : 'ghost'} className="w-full justify-between">
                              <div className="flex items-center gap-2">
                                  <UwpLogo className="mr-2 h-4 w-4" />
                                  <Link href={`/parties/${uwpParty.id}`} className="flex-grow text-left">UWP</Link>
                              </div>
                              <ChevronRight className={`h-4 w-4 transition-transform ${isUwpOpen ? 'rotate-90' : ''}`} />
                          </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                           <SidebarMenuItem>
                                <Collapsible open={isUwpCandidatesOpen} onOpenChange={setIsUwpCandidatesOpen}>
                                    <CollapsibleTrigger asChild>
                                        <Button variant='ghost' className="w-full justify-between h-8 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Users className="mr-2 h-4 w-4" />
                                                Candidates
                                            </div>
                                            <ChevronRight className={`h-4 w-4 transition-transform ${isUwpCandidatesOpen ? 'rotate-90' : ''}`} />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <ScrollArea className="h-48">
                                            <SidebarMenuSub>
                                                {loadingUwpCandidates ? <p className="p-2 text-xs text-muted-foreground">Loading...</p> : sortedUwpCandidates.map(candidate => (
                                                    <SidebarMenuItem key={candidate.id}>
                                                        <SidebarMenuSubButton asChild isActive={pathname === `/candidates/${candidate.id}`} size="sm">
                                                            <Link href={`/candidates/${candidate.id}`}>
                                                                {candidate.firstName} {candidate.lastName}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </ScrollArea>
                                    </CollapsibleContent>
                                </Collapsible>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuSubButton asChild isActive={pathname.startsWith('/events')}>
                                    <Link href="/events">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Events
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuItem>
                        </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
              </SidebarMenuItem>
          )}

          {slpParty && (
              <SidebarMenuItem>
                  <Collapsible open={isSlpOpen} onOpenChange={setIsSlpOpen}>
                      <CollapsibleTrigger asChild>
                           <Button variant={isSlpOpen ? 'secondary' : 'ghost'} className="w-full justify-between">
                              <div className="flex items-center gap-2">
                                  <SlpLogo className="mr-2 h-4 w-4" />
                                  <Link href={`/parties/${slpParty.id}`} className="flex-grow text-left">SLP</Link>
                              </div>
                              <ChevronRight className={`h-4 w-4 transition-transform ${isSlpOpen ? 'rotate-90' : ''}`} />
                          </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                             <SidebarMenuItem>
                                <Collapsible open={isSlpCandidatesOpen} onOpenChange={setIsSlpCandidatesOpen}>
                                    <CollapsibleTrigger asChild>
                                            <Button variant='ghost' className="w-full justify-between h-8 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Users className="mr-2 h-4 w-4" />
                                                Candidates
                                            </div>
                                            <ChevronRight className={`h-4 w-4 transition-transform ${isSlpCandidatesOpen ? 'rotate-90' : ''}`} />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <ScrollArea className="h-48">
                                            <SidebarMenuSub>
                                                {loadingSlpCandidates ? <p className="p-2 text-xs text-muted-foreground">Loading...</p> : sortedSlpCandidates.map(candidate => (
                                                    <SidebarMenuItem key={candidate.id}>
                                                        <SidebarMenuSubButton asChild isActive={pathname === `/candidates/${candidate.id}`} size="sm">
                                                            <Link href={`/candidates/${candidate.id}`}>
                                                                {candidate.firstName} {candidate.lastName}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </ScrollArea>
                                    </CollapsibleContent>
                                </Collapsible>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuSubButton asChild isActive={pathname.startsWith('/events-2')}>
                                    <Link href="/events-2">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Events
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuItem>
                        </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
              </SidebarMenuItem>
          )}


          {user && (
              <>
                  <SidebarSeparator className="my-2" />
                  <SidebarGroup>
                      <SidebarGroupLabel>Admin</SidebarGroupLabel>
                      <SidebarMenu>
                          {adminNavItems.map((item) => (
                              <SidebarMenuItem key={item.href}>
                                  <Button
                                  asChild
                                  variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                                  className="w-full justify-start"
                                  >
                                  <Link href={item.href}>
                                      <item.icon className="mr-2 h-4 w-4" />
                                      {item.label}
                                  </Link>
                                  </Button>
                              </SidebarMenuItem>
                          ))}
                      </SidebarMenu>
                  </SidebarGroup>
              </>
          )}
        </SidebarMenu>
        <div className="mt-auto p-2 space-y-2">
            <SidebarMenu>
                <AuthSection />
            </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
