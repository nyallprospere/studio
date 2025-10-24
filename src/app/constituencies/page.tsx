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
import { Vote, Home, Users, BarChart3, TrendingUp, Landmark, Map, Settings, Shield, LogIn, LogOut, UserPlus, FilePlus, Calendar, Pencil, Archive, Cat, ImageIcon, Globe, Share2, Mail, Megaphone, LineChart, Rss, Flag } from 'lucide-react';
import { Button } from '../ui/button';
import { useUser, useAuth, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Election, Party, Candidate, Report } from '@/lib/types';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { SlpLogo, UwpLogo } from '../icons';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';


export const mainNavItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/polls', icon: BarChart3, label: 'Polls' },
  { href: '/predictions', icon: TrendingUp, label: 'Predictions' },
  { href: '/election-news', icon: Rss, label: 'Election News' },
  { href: '/make-your-own', icon: Pencil, label: 'Make Your Own' },
  { href: '/interactive-maps', icon: Map, label: 'Interactive Maps' },
];

export const adminNavItems = [
    { href: '/admin/elections', icon: Vote, label: 'Manage Elections' },
    { href: '/admin/parties', icon: Shield, label: 'Manage Parties' },
    { href: '/admin/logos', icon: ImageIcon, label: 'Manage Logos' },
    { href: '/admin/events', icon: Calendar, label: 'Manage Events'},
    { href: '/admin/results', icon: Landmark, label: 'Manage Election Results' },
    { href: '/admin/constituencies', icon: FilePlus, label: 'Manage Constituencies' },
    { href: '/admin/regions', icon: Globe, label: 'Manage Regions' },
    { href: '/admin/mailing-list', icon: Mail, label: 'Manage Mailing List' },
    { href: '/admin/ads', icon: Megaphone, label: 'Manage Ads' },
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
  const [isManageCandidatesOpen, setIsManageCandidatesOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isMapSubmissionsOpen, setIsMapSubmissionsOpen] = useState(false);
  const [isMakeYourOwnOpen, setIsMakeYourOwnOpen] = useState(false);


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
  
  const pendingReportsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'reports'), where('status', '==', 'pending')) : null, [firestore]);
  const { data: pendingReports } = useCollection<Report>(pendingReportsQuery);
  const pendingReportsCount = pendingReports?.length || 0;


  const sortedElections = useMemo(() => {
    if (!elections) return [];
    // Filter out the 1974 election and then sort
    return elections
      .filter(election => election.year !== 1974 && !election.isCurrent)
      .sort((a, b) => {
          if (a.year !== b.year) {
              return b.year - a.year;
          }
          return b.name.localeCompare(a.name);
    });
  }, [elections]);

  const candidateSorter = (a: Candidate, b: Candidate) => {
    // Party Leader first
    if (a.isPartyLeader) return -1;
    if (b.isPartyLeader) return 1;

    // Deputy Leaders next
    if (a.isDeputyLeader && !b.isDeputyLeader) return -1;
    if (!a.isDeputyLeader && b.isDeputyLeader) return 1;
    if (a.isDeputyLeader && b.isDeputyLeader) {
      return a.lastName.localeCompare(b.lastName);
    }

    // 'higher' level next
    if (a.partyLevel === 'higher' && b.partyLevel !== 'higher') return -1;
    if (a.partyLevel !== 'higher' && b.partyLevel === 'higher') return 1;
    if (a.partyLevel === 'higher' && b.partyLevel === 'higher') {
      return a.lastName.localeCompare(b.lastName);
    }
    
    // finally alphabetical
    return a.lastName.localeCompare(b.lastName);
  };

  const sortedUwpCandidates = useMemo(() => uwpCandidates ? [...uwpCandidates].sort(candidateSorter) : [], [uwpCandidates]);
  const sortedSlpCandidates = useMemo(() => slpCandidates ? [...slpCandidates].sort(candidateSorter) : [], [slpCandidates]);

  useEffect(() => {
    setIsResultsOpen(pathname.startsWith('/results') || pathname.startsWith('/historical-trends'));
    setIsManageCandidatesOpen(pathname.startsWith('/admin/candidates') || pathname.startsWith('/archive'));
    setIsAnalyticsOpen(pathname.startsWith('/admin/analytics'));
    setIsNewsOpen(pathname.startsWith('/admin/news') || pathname.startsWith('/admin/reports'));
    setIsMapSubmissionsOpen(pathname.startsWith('/admin/map-submissions'));
    setIsMakeYourOwnOpen(pathname.startsWith('/make-your-own') || pathname.startsWith('/admin/map-submissions/sharing'));

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
              <Collapsible open={isMakeYourOwnOpen} onOpenChange={setIsMakeYourOwnOpen}>
                  <CollapsibleTrigger asChild>
                      <Button variant={isMakeYourOwnOpen ? 'secondary' : 'ghost'} className="w-full justify-between">
                          <div className="flex items-center gap-2">
                              <Pencil className="mr-2 h-4 w-4" />
                              Make Your Own
                          </div>
                          <ChevronRight className={`h-4 w-4 transition-transform ${isMakeYourOwnOpen ? 'rotate-90' : ''}`} />
                      </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                      <SidebarMenuSub>
                          <SidebarMenuItem>
                              <SidebarMenuSubButton asChild isActive={pathname === '/make-your-own'}>
                                  <Link href="/make-your-own">
                                      Prediction Map
                                  </Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuItem>
                          {user && (
                            <SidebarMenuItem>
                                <SidebarMenuSubButton asChild isActive={pathname.startsWith('/admin/map-submissions/sharing')}>
                                    <Link href="/admin/map-submissions/sharing">
                                        Sharing Settings
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuItem>
                          )}
                      </SidebarMenuSub>
                  </CollapsibleContent>
              </Collapsible>
          </SidebarMenuItem>

          <SidebarMenuItem>
              <Collapsible open={isResultsOpen} onOpenChange={setIsResultsOpen}>
                  <CollapsibleTrigger asChild>
                      <Button variant={(pathname.startsWith('/results') || pathname.startsWith('/historical-trends')) ? 'secondary' : 'ghost'} className="w-full justify-between">
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
                           <SidebarMenuItem>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith('/historical-trends')}>
                                  <Link href={`/historical-trends`}>
                                      Historical Trends
                                  </Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuItem>
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
                                <SidebarMenuSubButton asChild isActive={pathname.startsWith('/events')}>
                                    <Link href="/events">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Events
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <Collapsible open={isUwpCandidatesOpen} onOpenChange={setIsUwpCandidatesOpen}>
                                    <SidebarMenuSubButton asChild isActive={pathname.startsWith('/candidates')} className="justify-between">
                                        <CollapsibleTrigger className="w-full">
                                            <div className="flex items-center gap-2">
                                                <Users className="mr-2 h-4 w-4" />
                                                Candidates
                                            </div>
                                            <ChevronRight className={`h-4 w-4 transition-transform ${isUwpCandidatesOpen ? 'rotate-90' : ''}`} />
                                        </CollapsibleTrigger>
                                    </SidebarMenuSubButton>
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
                                <SidebarMenuSubButton asChild isActive={pathname.startsWith('/events-2')}>
                                    <Link href="/events-2">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Events
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <Collapsible open={isSlpCandidatesOpen} onOpenChange={setIsSlpCandidatesOpen}>
                                     <SidebarMenuSubButton asChild isActive={pathname.startsWith('/candidates')} className="justify-between">
                                        <CollapsibleTrigger className="w-full">
                                            <div className="flex items-center gap-2">
                                                <Users className="mr-2 h-4 w-4" />
                                                Candidates
                                            </div>
                                            <ChevronRight className={`h-4 w-4 transition-transform ${isSlpCandidatesOpen ? 'rotate-90' : ''}`} />
                                        </CollapsibleTrigger>
                                    </SidebarMenuSubButton>
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
                          <SidebarMenuItem>
                            <Collapsible open={isNewsOpen} onOpenChange={setIsNewsOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant={isNewsOpen ? 'secondary' : 'ghost'} className="w-full justify-between">
                                        <div className="flex items-center gap-2">
                                            <Rss className="mr-2 h-4 w-4" />
                                            Manage News
                                        </div>
                                        <ChevronRight className={`h-4 w-4 transition-transform ${isNewsOpen ? 'rotate-90' : ''}`} />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        <SidebarMenuItem>
                                            <SidebarMenuSubButton asChild isActive={pathname === '/admin/news'}>
                                                <Link href="/admin/news">
                                                    News Articles
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuSubButton asChild isActive={pathname === '/admin/reports'}>
                                                <Link href="/admin/reports" className="flex justify-between items-center w-full">
                                                    Reported Comments
                                                    {pendingReportsCount > 0 && <Badge variant="destructive">{pendingReportsCount}</Badge>}
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </Collapsible>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                              <Collapsible open={isManageCandidatesOpen} onOpenChange={setIsManageCandidatesOpen}>
                                  <CollapsibleTrigger asChild>
                                      <Button variant={isManageCandidatesOpen ? 'secondary' : 'ghost'} className="w-full justify-between">
                                          <div className="flex items-center gap-2">
                                              <Users className="mr-2 h-4 w-4" />
                                              Manage Candidates
                                          </div>
                                          <ChevronRight className={`h-4 w-4 transition-transform ${isManageCandidatesOpen ? 'rotate-90' : ''}`} />
                                      </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                      <SidebarMenuSub>
                                          <SidebarMenuItem>
                                              <SidebarMenuSubButton asChild isActive={pathname === '/admin/candidates'}>
                                                  <Link href="/admin/candidates">
                                                      Current Candidates
                                                  </Link>
                                              </SidebarMenuSubButton>
                                          </SidebarMenuItem>
                                           <SidebarMenuItem>
                                              <SidebarMenuSubButton asChild isActive={pathname === '/archive'}>
                                                  <Link href="/archive">
                                                      Archived Candidates
                                                  </Link>
                                              </SidebarMenuSubButton>
                                          </SidebarMenuItem>
                                      </SidebarMenuSub>
                                  </CollapsibleContent>
                              </Collapsible>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                              <Collapsible open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                                  <CollapsibleTrigger asChild>
                                      <Button variant={isAnalyticsOpen ? 'secondary' : 'ghost'} className="w-full justify-between">
                                          <div className="flex items-center gap-2">
                                              <LineChart className="mr-2 h-4 w-4" />
                                              View Analytics
                                          </div>
                                          <ChevronRight className={`h-4 w-4 transition-transform ${isAnalyticsOpen ? 'rotate-90' : ''}`} />
                                      </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                      <SidebarMenuSub>
                                          <SidebarMenuItem>
                                              <SidebarMenuSubButton asChild isActive={pathname === '/admin/analytics'}>
                                                  <Link href="/admin/analytics">
                                                      <BarChart3 className="mr-2 h-4 w-4" />
                                                      Ad Analytics
                                                  </Link>
                                              </SidebarMenuSubButton>
                                          </SidebarMenuItem>
                                      </SidebarMenuSub>
                                  </CollapsibleContent>
                              </Collapsible>
                          </SidebarMenuItem>
                           <SidebarMenuItem>
                              <Collapsible open={isMapSubmissionsOpen} onOpenChange={setIsMapSubmissionsOpen}>
                                  <CollapsibleTrigger asChild>
                                      <Button variant={isMapSubmissionsOpen ? 'secondary' : 'ghost'} className="w-full justify-between">
                                          <div className="flex items-center gap-2">
                                              <Share2 className="mr-2 h-4 w-4" />
                                              Map Submissions
                                          </div>
                                          <ChevronRight className={`h-4 w-4 transition-transform ${isMapSubmissionsOpen ? 'rotate-90' : ''}`} />
                                      </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                      <SidebarMenuSub>
                                          <SidebarMenuItem>
                                              <SidebarMenuSubButton asChild isActive={pathname === '/admin/map-submissions'}>
                                                  <Link href="/admin/map-submissions">
                                                      View Submissions
                                                  </Link>
                                              </SidebarMenuSubButton>
                                          </SidebarMenuItem>
                                      </SidebarMenuSub>
                                  </CollapsibleContent>
                              </Collapsible>
                          </SidebarMenuItem>
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