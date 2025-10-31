
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, BarChart3, TrendingUp, Landmark, Shield, Vote, Map, GripVertical, FilePlus, Settings, Calendar, Pencil, Rss } from 'lucide-react';
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
import { useUser, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { Event, Party, Constituency, Election, NewsArticle, VoterInformation } from '@/lib/types';
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

const adminSections = [
    { id: 'admin-elections', title: 'Manage Elections', href: '/admin/elections', icon: Vote },
    { id: 'admin-parties', title: 'Manage Parties', href: '/admin/parties', icon: Shield },
    { id: 'admin-candidates', title: 'Manage Candidates', href: '/admin/candidates', icon: Users },
    { id: 'admin-mailing-list', title: 'Manage Mailing List', href: '/admin/mailing-list', icon: Users },
    { id: 'admin-events', title: 'Manage Events', href: '/admin/events', icon: Calendar },
    { id: 'admin-results', title: 'Manage Election Results', href: '/admin/results', icon: Landmark },
    { id: 'admin-constituencies', title: 'Manage Constituencies', href: '/admin/constituencies', icon: FilePlus },
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

const getVictoryStatus = (slpSeats: number, uwpSeats: number, indSeats: number) => {
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

    const slpStatus = getStatus(slpSeats);
    const uwpStatus = getUWPStatus(uwpSeats);

    let status = 'Too Early To Tell';
    let color = 'bg-purple-500';

    if (slpStatus) {
        status = slpStatus;
        color = 'bg-red-500';
    } else if (uwpStatus) {
        status = uwpStatus;
        color = 'bg-yellow-400 text-black';
    } else if (slpSeats + indSeats >= 9) {
        status = 'SLP Wins Very Close Victory';
        color = 'bg-red-500';
    }
    
    return { status, color };
};


const VictoryStatusBar = ({ slpSeats, uwpSeats, indSeats }: { slpSeats: number, uwpSeats: number, indSeats: number }) => {
  const { status, color } = getVictoryStatus(slpSeats, uwpSeats, indSeats);

  return (
    <div className={`p-2 rounded-md text-center text-white font-bold mb-4 ${color}`}>
        {status}
    </div>
  );
};


export default function Home() {
  const { user } = useUser();
  const electionDate = new Date('2026-07-26T00:00:00');
  
  const { firestore } = useFirebase();
  const [allEventsViewMode, setAllEventsViewMode] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), where('isCurrent', '==', true)) : null, [firestore]);
  const newsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'news'), orderBy('articleDate', 'desc')) : null, [firestore]);
  const voterInfoQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'voter_information'), orderBy('title')) : null, [firestore]);
  
  const { data: events, isLoading: loadingEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  const { data: currentElections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: news, isLoading: loadingNews } = useCollection<NewsArticle>(newsQuery);
  const { data: voterInfoItems, isLoading: loadingVoterInfo } = useCollection<VoterInformation>(voterInfoQuery);
  
  const currentElection = useMemo(() => currentElections?.[0], [currentElections]);
  
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
        let leaning = constituency.politicalLeaning || 'tossup';
        const isSpecialConstituency = constituency.name === 'Castries North' || constituency.name === 'Castries Central';

        if (isSpecialConstituency) {
            if (leaning === 'solid-slp') leaning = 'solid-ind';
            if (leaning === 'lean-slp') leaning = 'lean-ind';
        }
        
        if (!acc[leaning]) {
            acc[leaning] = { count: 0, constituencies: [] };
        }
        acc[leaning].count++;
        (acc[leaning].constituencies as Constituency[]).push(constituency);

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
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.articleDate.toDate().getTime() - a.articleDate.toDate().getTime();
      })
      .slice(0, 3);
  }, [news]);

  const getAiForecastPartyColor = (party?: 'slp' | 'uwp' | 'ind') => {
    if (party === 'slp') return 'text-red-500';
    if (party === 'uwp') return 'text-yellow-500';
    if (party === 'ind') return 'text-blue-500';
    return 'text-muted-foreground';
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <MailingListPopup />
      

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
        <Card className="lg:col-span-1 bg-card shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-headline md:text-3xl text-primary">
              Countdown to Election Day 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Countdown date={electionDate} />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link
                href="https://www.sluelectoral.com/electoral/voter-record-search/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Check Your Voter Registration Status
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
       <div className="mt-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-center mb-6 text-primary">
            LucianVotes Election Forecast
        </h2>
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
             <Card>
                <CardContent className="pt-6">
                    <Button asChild className="w-full bg-gradient-to-r from-red-600 to-yellow-400 text-white hover:opacity-90 transition-opacity">
                        <Link href="/make-your-own">
                        Create and share your own election prediction.
                        </Link>
                    </Button>
                </CardContent>
            </Card>
          </div>
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardDescription>Our current projection for the 2026 general election.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="text-center mb-4 text-lg font-medium">
                            Forecasted Results: {' '}
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
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Events</CardTitle>
                        </div>
                        <div className="flex w-full items-center gap-1 p-1 bg-muted rounded-md mt-4">
                            <Button size="sm" variant={allEventsViewMode === 'upcoming' ? 'default' : 'ghost'} onClick={() => setAllEventsViewMode('upcoming')} className="flex-1">Upcoming</Button>
                            <Button size="sm" variant={allEventsViewMode === 'past' ? 'default' : 'ghost'} onClick={() => setAllEventsViewMode('past')} className="flex-1">Past</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                        {loadingEvents || loadingParties ? <p>Loading events...</p> : visibleAllEvents.length > 0 ? (
                            visibleAllEvents.map((event) => (
                            <EventCard key={event.id} event={event} party={getParty(event.partyId)} />
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No {allEventsViewMode} events found.</p>
                        )}
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Vote /> Voter Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingVoterInfo ? <p>Loading information...</p> : voterInfoItems?.map(item => (
                            <div key={item.id}>
                                <h3 className="font-semibold">{item.title}</h3>
                                <ul className="list-disc list-inside text-muted-foreground">
                                {item.items.map((text, index) => {
                                    const isUrl = text.startsWith('http');
                                    return (
                                    <li key={index}>
                                        {isUrl ? (
                                        <a href={text} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{text}</a>
                                        ) : (
                                        text
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
      
       <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Rss /> News
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
    </div>
  );
}
