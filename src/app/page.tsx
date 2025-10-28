

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
import type { Event, Party, Constituency, Election, NewsArticle } from '@/lib/types';
import { EventCard } from '@/components/event-card';
import { SortableFeatureCard } from '@/components/sortable-feature-card';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { MailingListPopup } from '@/components/mailing-list-popup';
import { NewsCard } from '@/components/news-card';
import { subDays } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  
  const { data: events, isLoading: loadingEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  const { data: currentElections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: news, isLoading: loadingNews } = useCollection<NewsArticle>(newsQuery);
  
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

   const { chartData, seatCounts } = useMemo(() => {
        if (!constituencies) return { chartData: [], seatCounts: {} };

        const counts = constituencies.reduce((acc, constituency) => {
            let leaning = constituency.politicalLeaning || 'tossup';
            const isSpecialConstituency = constituency.name === 'Castries North' || constituency.name === 'Castries Central';

            if (isSpecialConstituency) {
                if (leaning === 'solid-slp') leaning = 'solid-ind';
                if (leaning === 'lean-slp') leaning = 'lean-ind';
            }
            
            acc[leaning] = (acc[leaning] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const chartData = politicalLeaningOptions
            .map(opt => ({
                name: opt.label,
                value: counts[opt.value] || 0,
                fill: opt.color,
            }))
            .filter(item => item.value > 0);

        const seatCounts = {
            solidSlp: counts['solid-slp'] || 0,
            leanSlp: counts['lean-slp'] || 0,
            tossup: counts['tossup'] || 0,
            leanUwp: counts['lean-uwp'] || 0,
            solidUwp: counts['solid-uwp'] || 0,
            solidInd: counts['solid-ind'] || 0,
            leanInd: counts['lean-ind'] || 0,
        };
        
        (seatCounts as any).slpTotal = seatCounts.solidSlp + seatCounts.leanSlp;
        (seatCounts as any).uwpTotal = seatCounts.solidUwp + seatCounts.leanUwp;
        (seatCounts as any).indTotal = seatCounts.solidInd + seatCounts.leanInd;

        return { chartData, seatCounts: seatCounts as any };
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


  return (
    <div className="container mx-auto px-4 py-8">
      <MailingListPopup />
      <PageHeader
        title="LucianVotes"
        description="Your comprehensive guide to the 2026 General Elections."
      />

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
        </Card>
      </div>
      
       <div className="mt-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-center mb-6 text-primary">
            LucianVotes Election Forecast
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Interactive Map</CardTitle>
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
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="font-headline">Seat Count</CardTitle>
                                <CardDescription>Current political leaning of the 17 constituencies.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="text-center mb-4 text-sm font-medium">
                            Expected Results: {' '}
                            <span className="font-bold" style={{color: 'hsl(var(--chart-5))'}}>SLP - {seatCounts.slpTotal}</span> | {' '}
                            <span className="font-bold" style={{color: 'hsl(var(--chart-1))'}}>UWP - {seatCounts.uwpTotal}</span> | {' '}
                            <span className="font-bold" style={{color: 'hsl(221, 83%, 53%)'}}>IND - {seatCounts.indTotal}</span>
                        </div>
                        <ChartContainer config={chartConfig} className="h-40 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <ChartTooltip 
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
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
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
                            {politicalLeaningOptions
                            .filter(opt => chartData.some(d => d.name === opt.label))
                            .sort((a, b) => {
                                const order = ['Solid SLP', 'Lean SLP', 'Solid IND', 'Lean IND', 'Tossup', 'Lean UWP', 'Solid UWP'];
                                return order.indexOf(a.label) - order.indexOf(b.label);
                            })
                            .map((option) => {
                                const count = chartData.find(d => d.name === option.label)?.value || 0;
                                return (
                                    <TooltipProvider key={option.value}>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-default">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }}></span>
                                        <span>{option.label}</span>
                                        <span className="font-bold">({count})</span>
                                    </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-medium">Constituencies:</p>
                                        <ul className="list-disc pl-5">
                                            {constituencies
                                                ?.filter(c => {
                                                    let leaning = c.politicalLeaning || 'tossup';
                                                    const isSpecial = c.name === 'Castries North' || c.name === 'Castries Central';
                                                    if (isSpecial) {
                                                        if (leaning === 'solid-slp') leaning = 'solid-ind';
                                                        if (leaning === 'lean-slp') leaning = 'lean-ind';
                                                    }
                                                    return leaning === option.value;
                                                })
                                                .map(c => <li key={c.id}>{c.name}</li>)
                                            }
                                        </ul>
                                    </TooltipContent>
                                    </Tooltip>
                                    </TooltipProvider>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">
                            Build Your Election Map
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Button asChild className="w-full bg-gradient-to-r from-red-600 to-yellow-400 text-white hover:opacity-90 transition-opacity">
                            <Link href="/make-your-own">
                                Create and share your own election prediction.
                            </Link>
                        </Button>
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
                        <div>
                            <h3 className="font-semibold">Key Dates & Deadlines</h3>
                            <ul className="list-disc list-inside text-muted-foreground">
                                <li>Voter Registration Deadline: TBD</li>
                                <li>Advance Polling Day: TBD</li>
                                <li>General Election Day: July 26, 2026 (Tentative)</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold">Voter Requirements</h3>
                            <p className="text-muted-foreground">To be eligible to vote, you must be a citizen of St. Lucia, 18 years of age or older, and registered to vote in your constituency.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
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
    </div>
  );
}
