

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, BarChart3, TrendingUp, Landmark, Shield, Vote, Map, GripVertical, FilePlus, Settings, Calendar } from 'lucide-react';
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
import type { Event, Party, Constituency, Election } from '@/lib/types';
import { EventCard } from '@/components/event-card';
import { SortableFeatureCard } from '@/components/sortable-feature-card';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { MailingListForm } from '@/components/mailing-list-form';

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
  
  const { data: events, isLoading: loadingEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  const { data: currentElections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  
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
            const leaning = constituency.politicalLeaning || 'tossup';
            acc[leaning] = (acc[leaning] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const chartData = politicalLeaningOptions.map(opt => ({
            name: opt.label,
            value: counts[opt.value] || 0,
            fill: opt.color,
        })).filter(item => item.value > 0);

        const seatCounts = {
            solidSlp: counts['solid-slp'] || 0,
            leanSlp: counts['lean-slp'] || 0,
            tossup: counts['tossup'] || 0,
            leanUwp: counts['lean-uwp'] || 0,
            solidUwp: counts['solid-uwp'] || 0,
        };
        (seatCounts as any).slpTotal = seatCounts.solidSlp + seatCounts.leanSlp;
        (seatCounts as any).uwpTotal = seatCounts.solidUwp + seatCounts.leanUwp;

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


  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="LucianVotes"
        description="Your comprehensive guide to the 2026 General Elections."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <Card className="lg:col-span-2 bg-card shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-headline md:text-3xl text-primary">
              Countdown to Election Day 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Countdown date={electionDate} />
          </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="font-headline">Our Election Forecast</CardTitle>
                <CardDescription>Our latest projection of the 2026 election.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
                <ChartContainer config={chartConfig} className="h-40 w-full">
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
                                  {chartData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-3 gap-4 w-full text-center text-xs">
                    <div>
                        <p className="font-bold text-lg" style={{color: 'hsl(var(--chart-5))'}}>{seatCounts.slpTotal}</p>
                        <p className="text-muted-foreground font-semibold">SLP</p>
                        <div className="mt-2 space-y-1 text-muted-foreground">
                            <p>Solid: {seatCounts.solidSlp}</p>
                            <p>Lean: {seatCounts.leanSlp}</p>
                        </div>
                    </div>
                    <div>
                        <p className="font-bold text-lg" style={{color: 'hsl(var(--chart-4))'}}>{seatCounts.tossup}</p>
                        <p className="text-muted-foreground font-semibold">Tossup</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg" style={{color: 'hsl(var(--chart-1))'}}>{seatCounts.uwpTotal}</p>
                        <p className="text-muted-foreground font-semibold">UWP</p>
                         <div className="mt-2 space-y-1 text-muted-foreground">
                            <p>Solid: {seatCounts.solidUwp}</p>
                            <p>Lean: {seatCounts.leanUwp}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Events</CardTitle>
                    <CardDescription>Upcoming and past political events.</CardDescription>
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
                <CardTitle>Interactive Map</CardTitle>
                <CardDescription>Click on a constituency to learn more.</CardDescription>
            </CardHeader>
            <CardContent className="p-0.5">
                 <InteractiveSvgMap 
                    constituencies={constituencies ?? []} 
                    selectedConstituencyId={selectedConstituencyId}
                    onConstituencyClick={setSelectedConstituencyId}
                    election={currentElection}
                 />
            </CardContent>
        </Card>
      </div>

       <Card className="mt-8">
        <CardHeader>
          <CardTitle>Join Our Mailing List</CardTitle>
          <CardDescription>Get the latest election news and analysis delivered to your inbox.</CardDescription>
        </CardHeader>
        <CardContent>
          <MailingListForm />
        </CardContent>
      </Card>


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


       <Card className="mt-8">
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
  );

}
