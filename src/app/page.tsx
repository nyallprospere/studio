
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
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Event, Party, Constituency } from '@/lib/types';
import { EventCard } from '@/components/event-card';
import { SortableFeatureCard } from '@/components/sortable-feature-card';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';

const initialKeyFeatures = [
    {
      id: 'candidates',
      title: 'Candidate Profiles',
      description: 'Learn about the candidates and their platforms.',
      icon: Users,
      href: '/candidates',
    },
    {
      id: 'polls',
      title: 'Polling Data',
      description: 'View the latest poll results and trends.',
      icon: BarChart3,
      href: '/polls',
    },
    {
      id: 'predictions',
      title: 'AI Predictions',
      description: 'See our AI-powered election outcome predictions.',
      icon: TrendingUp,
      href: '/predictions',
    },
    {
      id: 'results',
      title: 'Past Results',
      description: 'Explore historical election data from 1974.',
      icon: Landmark,
      href: '/results',
    },
     {
      id: 'parties',
      title: 'Party Information',
      description: 'Discover the parties contesting the election.',
      icon: Shield,
      href: '/parties',
    },
    {
      id: 'constituencies',
      title: 'Constituencies',
      description: 'Find your constituency and its voting information.',
      icon: Map,
      href: '/constituencies',
    },
];

const adminSections = [
    { id: 'admin-elections', title: 'Manage Elections', href: '/admin/elections', icon: Vote },
    { id: 'admin-parties', title: 'Manage Parties', href: '/admin/parties', icon: Shield },
    { id: 'admin-candidates', title: 'Manage Candidates', href: '/admin/candidates', icon: Users },
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
  const [keyFeatures, setKeyFeatures] = useState(initialKeyFeatures);
  
  const { firestore } = useFirebase();
  const [allEventsViewMode, setAllEventsViewMode] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  
  const { data: events, isLoading: loadingEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  
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
            : dateB.getTime() - dateA.getTime();
      });
      
      return sorted;
  }

  const visibleAllEvents = useMemo(() => filterAndSortEvents(events || [], allEventsViewMode), [events, allEventsViewMode]);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      setKeyFeatures((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

   const chartData = useMemo(() => {
        if (!constituencies) return [];

        const counts = constituencies.reduce((acc, constituency) => {
            const leaning = constituency.politicalLeaning || 'tossup';
            acc[leaning] = (acc[leaning] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return politicalLeaningOptions.map(opt => ({
            name: opt.label,
            value: counts[opt.value] || 0,
            fill: opt.color,
        })).filter(item => item.value > 0);
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
                <CardTitle className="font-headline">Seat Count</CardTitle>
                <CardDescription>Current political leaning of the 17 constituencies.</CardDescription>
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
                                <Label
                                    content={({ viewBox }) => {
                                        if (viewBox && 'cx' in viewBox && 'cy' in viewBox && constituencies) {
                                            return (
                                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                    <tspan x={viewBox.cx} dy="-0.5em" className="text-3xl font-bold">{constituencies.length}</tspan>
                                                    <tspan x={viewBox.cx} dy="1.2em" className="text-sm text-muted-foreground">Seats</tspan>
                                                </text>
                                            )
                                        }
                                    }}
                                />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
                    {politicalLeaningOptions.map((option) => {
                        const count = chartData.find(d => d.name === option.label)?.value || 0;
                        if (count === 0) return null;
                        return (
                            <div key={option.value} className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }}></span>
                                <span>{option.label}</span>
                                <span className="font-bold">({count})</span>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
      </div>
      
       <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={keyFeatures.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {keyFeatures.map((feature) => (
                    <SortableFeatureCard key={feature.id} feature={feature} />
                ))}
            </div>
        </SortableContext>
      </DndContext>

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
            <CardContent className="p-2">
                 <InteractiveSvgMap 
                    constituencies={constituencies ?? []} 
                    selectedConstituencyId={selectedConstituencyId}
                    onConstituencyClick={setSelectedConstituencyId}
                 />
            </CardContent>
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
