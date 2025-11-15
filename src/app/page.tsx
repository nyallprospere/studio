
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, BarChart3, TrendingUp, Landmark, Shield, Vote, Map, GripVertical, FilePlus, Settings, Calendar, Pencil, Rss, ThumbsUp, ThumbsDown } from 'lucide-react';
import Countdown from '@/components/countdown';
import { PageHeader } from '@/components/page-header';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useUser, useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, Timestamp, where, doc, updateDoc, increment } from 'firebase/firestore';
import type { Event, Party, Constituency, Election, NewsArticle, VoterInformation, SiteSettings, Reel, Candidate } from '@/lib/types';
import { EventCard } from '@/components/event-card';
import { SortableFeatureCard } from '@/components/sortable-feature-card';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { MailingListPopup } from '@/components/mailing-list-popup';
import { NewsCard } from '@/components/news-card';
import { subDays } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { useToast } from '@/hooks/use-toast';
import { CandidateProfileDialog } from '@/components/candidate-profile-dialog';


const adminSections = [
    { id: 'admin-elections', title: 'Manage Elections', href: '/admin/elections', icon: Vote },
    { id: 'admin-parties', title: 'Manage Parties', href: '/admin/parties', icon: Shield },
    { id: 'admin-candidates', title: 'Manage Candidates', href: '/admin/candidates', icon: Users },
    { id: 'admin-mailing-list', title: 'Manage Mailing List', href: '/admin/mailing-list', icon: Users },
    { id: 'admin-events', title: 'Manage Events', href: '/admin/events', icon: Calendar },
    { id: 'admin-results', title: 'Manage Election Results', href: '/admin/results', icon: Landmark },
    { id: 'admin-constituencies', title: 'Manage Projection Map', href: '/admin/constituencies', icon: FilePlus },
    { id: 'admin-map', title: 'Manage Map', href: '/admin/map', icon: Map },
    { id: 'admin-settings', title: 'Manage Settings', href: '/admin/settings', icon: Settings },
];

const politicalLeaningOptions = [
    { value: 'solid-slp', label: 'Solid SLP', color: 'hsl(var(--chart-5))' },
    { value: 'lean-slp', label: 'Lean SLP', color: 'hsl(var(--chart-3))' },
    { value: 'lean-ind', label: 'Lean IND', color: 'hsl(221, 83%, 73%)' },
    { value: 'solid-ind', label: 'Solid IND', color: 'hsl(221, 83%, 53%)' },
    { value: 'tossup', label: 'Tossup', color: 'hsl(var(--chart-4))' },
    { value: 'lean-uwp', label: 'Lean UWP', color: 'hsl(var(--chart-2))' },
    { value: 'solid-uwp', label: 'Solid UWP', color: 'hsl(var(--chart-1))' },
];

const VictoryStatusBar = ({ slpSeats, uwpSeats, indSeats }: { slpSeats: number, uwpSeats: number, indSeats: number }) => {
  const getStatus = (seats: number) => {
      if (seats >= 16) return 'SLP Wins a Landslide!';
      if (seats >= 14) return 'SLP Wins a Decisive Victory';
      if (seats >= 11) return 'SLP Wins The Election.';
      if (seats >= 9) return 'SLP Wins Close Victory';
      return null;
  };

  const getUWPStatus = (seats: number) => {
      if (seats >= 16) return 'UWP Wins a Landslide!';
      if (seats >= 14) return 'UWP Wins a Decisive Victory';
      if (seats >= 11) return 'UWP Wins The Election.';
      if (seats >= 9) return 'UWP Wins Close Victory';
      return null;
  }

  const combinedSlpSeats = slpSeats + indSeats;
  const slpStatus = getStatus(combinedSlpSeats);
  const uwpStatus = getUWPStatus(uwpSeats);

  let status = 'Too Early To Tell';
  let color = 'bg-purple-500';

  if (slpStatus) {
      status = slpStatus;
      color = 'bg-red-500';
  } else if (uwpStatus) {
      status = uwpStatus;
      color = 'bg-yellow-400 text-black';
  } else if (combinedSlpSeats >= 9) {
      status = 'SLP Wins Very Close Victory';
      color = 'bg-red-500';
  }
  
  return (
    <div className={`p-2 rounded-md text-center text-white font-bold mb-4 ${color}`}>
        {status}
    </div>
  );
};


export default function Home() {
  const { user } = useUser();
  const { toast } = useToast();
  
  const { firestore } = useFirebase();
  const [allEventsViewMode, setAllEventsViewMode] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), where('isCurrent', '==', true)) : null, [firestore]);
  const newsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'news'), orderBy('articleDate', 'desc')) : null, [firestore]);
  const voterInfoQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'voter_information'), orderBy('title')) : null, [firestore]);
  const siteSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'settings', 'site') : null), [firestore]);
  const reelsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'reels'), orderBy('order')) : null, [firestore]);
  const candidatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);

  
  const { data: events, isLoading: loadingEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);
  const { data: currentElections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: news, isLoading: loadingNews } = useCollection<NewsArticle>(newsQuery);
  const { data: voterInfoItems, isLoading: loadingVoterInfo } = useCollection<VoterInformation>(voterInfoQuery);
  const { data: siteSettings } = useDoc<SiteSettings>(siteSettingsRef);
  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);

  const [likedReels, setLikedReels] = useState<string[]>([]);
  const [dislikedReels, setDislikedReels] = useState<string[]>([]);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [profileCandidate, setProfileCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    const liked = JSON.parse(localStorage.getItem('likedReels') || '[]');
    setLikedReels(liked);
    const disliked = JSON.parse(localStorage.getItem('dislikedReels') || '[]');
    setDislikedReels(disliked);
  }, []);

  const handleLikeReel = async (e: React.MouseEvent, reelId: string) => {
    e.stopPropagation();
    if (!firestore || likedReels.includes(reelId)) return;

    const reelRef = doc(firestore, 'reels', reelId);
    await updateDoc(reelRef, { likeCount: increment(1) });
    const newLiked = [...likedReels, reelId];
    setLikedReels(newLiked);
    localStorage.setItem('likedReels', JSON.stringify(newLiked));
    toast({ title: 'Reel Liked!' });
  };

  const handleDislikeReel = async (e: React.MouseEvent, reelId: string) => {
    e.stopPropagation();
    if (!firestore || dislikedReels.includes(reelId)) return;

    const reelRef = doc(firestore, 'reels', reelId);
    await updateDoc(reelRef, { dislikeCount: increment(1) });
    const newDisliked = [...dislikedReels, reelId];
    setDislikedReels(newDisliked);
    localStorage.setItem('dislikedReels', JSON.stringify(newDisliked));
    toast({ title: 'Reel Disliked' });
  };


  
  const currentElection = useMemo(() => currentElections?.[0], [currentElections]);
  const electionDate = useMemo(() => currentElection?.date ? (currentElection.date as unknown as Timestamp).toDate() : new Date('2026-07-26T00:00:00'), [currentElection]);
  
  const getParty = (partyId: string) => parties?.find(p => p.id === partyId);

  const filterAndSortEvents = (events: Event[], mode: 'upcoming' | 'past') => {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to start of today

      const filtered = events.filter(event => {
          const eventDate = (event.date as unknown as Timestamp)?.toDate ? (event.date as unknown as Timestamp).toDate() : new Date(event.date);
          return mode === 'upcoming' ? eventDate >= now : eventDate < now;
      });

      // Upcoming events should be sorted ascending (soonest first)
      const sorted = filtered.sort((a, b) => {
          const dateA = (a.date as unknown as Timestamp)?.toDate ? (a.date as unknown as Timestamp).toDate() : new Date(a.date);
          const dateB = (b.date as unknown as Timestamp)?.toDate ? (b.date as unknown as Timestamp).toDate() : new Date(b.date);
          return mode === 'upcoming' 
            ? dateA.getTime() - dateB.getTime() 
            : dateB.getTime() - a.getTime();
      });
      
      return sorted;
  }

  const visibleAllEvents = useMemo(() => filterAndSortEvents(events || [], allEventsViewMode), [events, allEventsViewMode]);

   const { chartData, seatCounts, tossupConstituencies, aiForecastSeatCounts } = useMemo(() => {
    if (!constituencies) return { chartData: [], seatCounts: {}, tossupConstituencies: [], aiForecastSeatCounts: {} };
    
    const counts = constituencies.reduce((acc, constituency) => {
        const leaningValue = constituency.politicalLeaning || 'tossup';
        let effectiveLeaning = leaningValue;
        const isSpecialConstituency = constituency.name === 'Castries North' || constituency.name === 'Castries Central';

        if (isSpecialConstituency) {
            if (leaningValue === 'solid-slp' || leaningValue === 'lean-slp' || leaningValue === 'ind') {
                 effectiveLeaning = 'solid-ind';
            }
        }
        
        if (!acc[effectiveLeaning]) {
            acc[effectiveLeaning] = { count: 0, constituencies: [] };
        }
        acc[effectiveLeaning].count++;
        (acc[effectiveLeaning].constituencies as Constituency[]).push(constituency);

        return acc;
    }, {} as Record<string, { count: number, constituencies: Constituency[] }>);

    const chartData = politicalLeaningOptions
        .map(opt => ({
            name: opt.label,
            value: counts[opt.value]?.count || 0,
            constituencies: counts[opt.value]?.constituencies || [],
            fill: opt.color,
        }))
        .filter(item => item.value > 0);

    const seatCounts = {
        solidSlp: counts['solid-slp']?.count || 0,
        leanSlp: counts['lean-slp']?.count || 0,
        tossup: counts['tossup']?.count || 0,
        leanUwp: counts['lean-uwp']?.count || 0,
        solidUwp: counts['solid-uwp']?.count || 0,
        solidInd: counts['solid-ind']?.count || 0,
        leanInd: counts['lean-ind']?.count || 0,
    };
    
    (seatCounts as any).slpTotal = seatCounts.solidSlp + seatCounts.leanSlp;
    (seatCounts as any).uwpTotal = seatCounts.solidUwp + seatCounts.leanUwp;
    (seatCounts as any).indTotal = seatCounts.solidInd + seatCounts.leanInd;

    const tossupConstituencies = counts['tossup']?.constituencies || [];
    
    const aiForecastSeatCounts = constituencies.reduce((acc, c) => {
        const party = c.aiForecastParty || 'tossup';
        acc[party] = (acc[party] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return { chartData, seatCounts: seatCounts as any, tossupConstituencies, aiForecastSeatCounts };
}, [constituencies]);

    const chartConfig = politicalLeaningOptions.reduce((acc, option) => {
        // @ts-ignore
        acc[option.label] = {
            label: option.label,
            color: option.color,
        };
        return acc;
    }, {});
    
  const trendingNews = useMemo(() => {
    if (!news) return [];
    const oneWeekAgo = subDays(new Date(), 7);
    return [...news]
      .sort((a, b) => {
        const scoreA = (a.articleDate?.toDate() > oneWeekAgo ? a.likeCount || 0 : 0);
        const scoreB = (b.articleDate?.toDate() > oneWeekAgo ? b.likeCount || 0 : 0);
        if (scoreB !== scoreA) return scoreB - a.likeCount;
        return b.articleDate.toDate().getTime() - a.articleDate.toDate().getTime();
      })
      .slice(0, 3);
  }, [news]);

  const getAiForecastPartyColor = (party?: 'slp' | 'uwp' | 'ind') => {
    if (party === 'slp') return 'text-red-600';
    if (party === 'uwp') return 'text-yellow-500';
    if (party === 'ind') return 'text-blue-500';
    return 'text-muted-foreground';
  };
  
  const openProfile = (candidate: Candidate) => {
    setProfileCandidate(candidate);
    setProfileOpen(true);
  };


  return (
    <>
      <MailingListPopup />
      
      {siteSettings?.siteBannerUrl && (
        <div className="relative w-full aspect-[21/9]">
            <Image src={siteSettings.siteBannerUrl} alt="Site Banner" fill className="object-cover" />
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
          <Card className="lg:col-span-1 bg-card shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-headline md:text-3xl text-primary">
                Countdown to Election Day {electionDate.getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Countdown date={electionDate} />
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button asChild className="whitespace-normal h-auto text-center px-4">
                <a href="https://www.sluelectoral.com/electoral/voter-record-search/"
                  target="_blank"
                  rel="noopener noreferrer">
                    Check Your Voter Registration
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="mt-12">
            <div className="text-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-primary">
                    LucianVotes Election Forecast
                </h2>
                 <div className="mt-4">
                    <Button asChild className="w-full max-w-md mx-auto bg-gradient-to-r from-red-600 to-yellow-400 text-white hover:opacity-90 transition-opacity">
                        <Link href="/make-your-own">
                        Build and Share your Map!
                        </Link>
                    </Button>
                </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <Card>
                  <CardHeader>
                      <CardDescription>Click on a constituency to learn more.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0.5">
                      <InteractiveSvgMap 
                          constituencies={constituencies ?? []} 
                          selectedConstituencyId={selectedConstituencyId}
                          onConstituencyClick={setSelectedConstituencyId}
                          election={currentElection}
                          hideLogos={true}
                          popoverVariant="dashboard"
                      />
                  </CardContent>
              </Card>
            </div>
              <div className="space-y-8">
                  <Card>
                      <CardContent className="flex flex-col items-center pt-6">
                          <div className="text-center mb-4 text-lg font-medium">
                              Forecasted Results (With Tossups): {' '}
                              <span className="font-bold" style={{color: 'hsl(var(--chart-5))'}}>SLP - {seatCounts.slpTotal}</span> | {' '}
                              <span className="font-bold" style={{color: 'hsl(var(--chart-1))'}}>UWP - {seatCounts.uwpTotal}</span> | {' '}
                              <span className="font-bold" style={{color: 'hsl(221, 83%, 53%)'}}>IND - {seatCounts.indTotal}</span>
                          </div>
                          <VictoryStatusBar slpSeats={seatCounts.slpTotal} uwpSeats={seatCounts.uwpTotal} indSeats={seatCounts.indTotal} />
                          <ChartContainer config={chartConfig} className="h-40 w-full relative">
                              <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                      <ChartTooltip 
                                          cursor={false}
                                          content={(props) => {
                                              const { payload } = props;
                                              if (!payload || payload.length === 0) return null;
                                              const item = payload[0].payload;
                                              return (
                                                  <div className="bg-background border p-2 rounded-md shadow-lg text-sm max-w-xs">
                                                      <p className="font-bold text-base mb-1">{item.name} ({item.value})</p>
                                                      <ul className="list-disc pl-5">
                                                          {item.constituencies.map((c: Constituency) => <li key={c.id}>{c.name}</li>)}
                                                      </ul>
                                                  </div>
                                              )
                                          }}
                                      />
                                      <Pie 
                                          data={chartData} 
                                          dataKey="value"
                                          nameKey="name"
                                          cx="50%" 
                                          cy="100%" 
                                          startAngle={180} 
                                          endAngle={0} 
                                          innerRadius="60%"
                                          outerRadius="100%"
                                          paddingAngle={2}
                                      >
                                          <Label
                                              content={({ viewBox }) => {
                                                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                      return (
                                                          <text
                                                              x={viewBox.cx}
                                                              y={viewBox.cy}
                                                              textAnchor="middle"
                                                              dominantBaseline="middle"
                                                          >
                                                              <tspan
                                                                  x={viewBox.cx}
                                                                  y={viewBox.cy}
                                                                  className="text-3xl font-bold"
                                                              >
                                                              </tspan>
                                                          </text>
                                                      )
                                                  }
                                              }}
                                              />
                                          {chartData.map((entry) => (
                                              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                          ))}
                                      </Pie>
                                  </PieChart>
                              </ResponsiveContainer>
                              <div
                                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full w-px h-[calc(50%+4px)] bg-black"
                                  style={{ top: '100%', transform: 'translateX(-50%) translateY(-100%)' }}
                              ></div>
                              <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 text-xs font-semibold text-black bg-background px-1">
                                  9 to win
                              </div>
                          </ChartContainer>
                          {tossupConstituencies.length > 0 && (
                              <div className="w-full mt-4 text-center">
                                  <h4 className="font-semibold text-base mb-2">Constituencies To Watch</h4>
                                  <ul className="text-sm space-y-1">
                                      {tossupConstituencies.map(c => (
                                          <li key={c.id} className="flex justify-between items-center text-left">
                                              <span>{c.name}</span>
                                              {c.aiForecast && c.aiForecastParty && (
                                                  <span className="text-xs font-mono p-1 rounded-md bg-muted">
                                                      <span className={cn('font-bold', getAiForecastPartyColor(c.aiForecastParty))}>
                                                          {c.aiForecastParty.toUpperCase()} {c.aiForecast > 0 ? '+' : ''}{c.aiForecast.toFixed(1)}%
                                                      </span>
                                                  </span>
                                              )}
                                          </li>
                                      ))}
                                  </ul>
                                  <div className="text-center mt-4 text-lg font-medium">
                                      Forecasted Results (No Tossups): {' '}
                                      <span className="font-bold" style={{color: 'hsl(var(--chart-5))'}}>SLP - {aiForecastSeatCounts['slp'] || 0}</span> |{' '}
                                      <span className="font-bold" style={{color: 'hsl(var(--chart-1))'}}>UWP - {aiForecastSeatCounts['uwp'] || 0}</span> |{' '}
                                      <span className="font-bold" style={{color: 'hsl(221, 83%, 53%)'}}>IND - {aiForecastSeatCounts['ind'] || 0}</span>
                                  </div>
                              </div>
                          )}
                      </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                     {reels && reels.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="font-headline flex items-center gap-2">
                            Social Media Reels
                          </CardTitle>
                          <CardDescription>What people are saying on social media.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Carousel
                            opts={{ align: "start", loop: true }}
                            plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
                            className="w-full"
                          >
                            <CarouselContent>
                              {reels.map((reel) => (
                                <CarouselItem key={reel.id} className="md:basis-1/2 lg:basis-full">
                                  <div className="p-1 h-full">
                                    <Card className="h-full flex flex-col">
                                      <CardHeader className="p-4">
                                        <CardTitle className="text-base">
                                          <Link href={reel.authorUrl} target="_blank" className="hover:underline">{reel.authorName}</Link>
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="p-0 aspect-[9/16] overflow-hidden flex-grow">
                                        <iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(reel.postUrl)}&show_text=false&width=560`} width="100%" height="100%" style={{border:'none', overflow:'hidden'}} allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
                                      </CardContent>
                                      <CardFooter className="p-2 justify-end gap-2">
                                          <Button variant={likedReels.includes(reel.id) ? "default" : "outline"} size="sm" onClick={(e) => handleLikeReel(e, reel.id)} disabled={likedReels.includes(reel.id)}>
                                              <ThumbsUp className="mr-2 h-4 w-4" />
                                              {reel.likeCount || 0}
                                          </Button>
                                          <Button variant={dislikedReels.includes(reel.id) ? "destructive" : "outline"} size="sm" onClick={(e) => handleDislikeReel(e, reel.id)} disabled={dislikedReels.includes(reel.id)}>
                                              <ThumbsDown className="mr-2 h-4 w-4" />
                                              {reel.dislikeCount || 0}
                                          </Button>
                                      </CardFooter>
                                    </Card>
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious className="hidden sm:flex" />
                            <CarouselNext className="hidden sm:flex" />
                          </Carousel>
                        </CardContent>
                      </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Vote /> Voter Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingVoterInfo ? <p>Loading information...</p> : voterInfoItems?.filter(item => item.isVisible !== false).map(item => (
                                <div key={item.id}>
                                     <h3 className="font-semibold">
                                        {item.title === 'Confirm Your Registration & Polling Station' ? (
                                            <a href="https://www.sluelectoral.com/electoral/voter-record-search/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                {item.title}
                                            </a>
                                        ) : item.title === 'Register to Vote' ? (
                                             <Button asChild className="w-full">
                                                <a href="https://www.sluelectoral.com/electoral/registration/" target="_blank" rel="noopener noreferrer">
                                                    {item.title}
                                                </a>
                                            </Button>
                                        ) : (
                                            item.title
                                        )}
                                    </h3>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                    {item.items.filter(i => i.isVisible).map((textItem, index) => {
                                        const isUrl = textItem.text.startsWith('http');
                                        return (
                                        <li key={index}>
                                            {isUrl ? (
                                            <a href={textItem.text} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{textItem.text}</a>
                                            ) : (
                                            textItem.text
                                            )}
                                        </li>
                                        );
                                    })}
                                    </ul>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                  </div>
              </div>
          </div>
        </div>

        <div className="mt-12">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Meet the Candidates</CardTitle>
                    <CardDescription>A gallery of all candidates for the upcoming election.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {loadingCandidates ? (
                        Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-24 w-24 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))
                    ) : (
                        candidates?.map(candidate => (
                            <div key={candidate.id} className="flex flex-col items-center text-center gap-2 cursor-pointer" onClick={() => openProfile(candidate)}>
                                <div className="relative h-24 w-24 rounded-full overflow-hidden bg-muted">
                                    {candidate.imageUrl ? (
                                        <Image src={candidate.imageUrl} alt={candidate.name} fill className="object-cover" />
                                    ) : null}
                                </div>
                                <p className="font-semibold text-sm leading-tight">{candidate.name}</p>
                                <p className="text-xs text-muted-foreground">{getParty(candidate.partyId)?.name}</p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
        
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Rss /> Recent News
              </CardTitle>
              <CardDescription>The latest headlines shaping the election.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {loadingNews ? (
                Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><p>Loading...</p></CardContent></Card>)
              ) : trendingNews.length > 0 ? (
                trendingNews.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))
              ) : (
                <p className="text-muted-foreground col-span-full text-center">No recent news.</p>
              )}
            </CardContent>
            <CardFooter>
                  <Button asChild variant="secondary" className="w-full">
                      <Link href="/election-news">View All News</Link>
                  </Button>
            </CardFooter>
          </Card>
        </div>


        {user && (
            <div className="mt-12">
              <PageHeader
                  title="Admin Dashboard"
                  description="Manage the content for LucianVotes."
              />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {adminSections.map((section) => (
                      <Card key={section.id}>
                          <CardHeader className="flex flex-row items-center justify-between">
                              <CardTitle className="font-headline">{section.title}</CardTitle>
                              <section.icon className="w-6 h-6 text-muted-foreground"/>
                          </CardHeader>
                          <CardContent>
                              <Button asChild className="w-full">
                                  <Link href={section.href}>Go to section</Link>
                              </Button>
                          </CardContent>
                      </Card>
                  ))}
              </div>
            </div>
        )}
        {profileCandidate && <CandidateProfileDialog candidate={profileCandidate} isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />}
      </div>
    </>
  );
}
