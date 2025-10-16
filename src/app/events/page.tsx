
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Event, Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import Image from 'next/image';
import { Calendar, MapPin, Shield, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EventProfileDialog } from '@/components/event-profile-dialog';
import { Button } from '@/components/ui/button';

function EventCard({ event, partyName }: { event: Event, partyName: string }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const eventDate = (event.date as unknown as Timestamp)?.toDate ? (event.date as unknown as Timestamp).toDate() : new Date(event.date);
    
    return (
        <>
            <Card className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full" onClick={() => setIsDialogOpen(true)}>
                <CardHeader className="flex-row items-start gap-4 p-4">
                     {event.imageUrl ? (
                        <Image src={event.imageUrl} alt={event.title} width={80} height={80} className="rounded-md object-cover aspect-square" />
                    ) : (
                        <div className="h-20 w-20 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}
                    <div className="flex-grow">
                        <p className="font-semibold">{event.title}</p>
                        <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <p className="flex items-center gap-2"><Shield className="h-4 w-4" /> {partyName}</p>
                            <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {format(eventDate, "PPP")}</p>
                            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location}</p>
                        </div>
                    </div>
                </CardHeader>
                {event.description && 
                    <CardContent className="flex-grow p-4 pt-0">
                        <p className="text-sm mt-2 line-clamp-2">{event.description}</p>
                    </CardContent>
                }
                <CardFooter className="p-4 pt-0 mt-auto">
                    <Button variant="secondary" className="w-full" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
                        More Info <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
            <EventProfileDialog event={event} isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
        </>
    );
}

function EventsPageSkeleton() {
    return (
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function EventsPage() {
  const { firestore } = useFirebase();
  const [uwpViewMode, setUwpViewMode] = useState<'upcoming' | 'past'>('upcoming');
  const [slpViewMode, setSlpViewMode] = useState<'upcoming' | 'past'>('upcoming');
  const [allEventsViewMode, setAllEventsViewMode] = useState<'upcoming' | 'past'>('upcoming');
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  
  const { data: events, isLoading: loadingEvents, error: errorEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  
  const getPartyName = (partyId: string) => parties?.find(p => p.id === partyId)?.name || 'N/A';
  const isLoading = loadingEvents || loadingParties;

  const { uwpEvents, slpEvents } = useMemo(() => {
    if (!events || !parties) {
      return { uwpEvents: [], slpEvents: [] };
    }
    const uwp = parties.find(p => p.acronym === 'UWP');
    const slp = parties.find(p => p.acronym === 'SLP');
    
    const uwpEvents = uwp ? events.filter(e => e.partyId === uwp.id) : [];
    const slpEvents = slp ? events.filter(e => e.partyId === slp.id) : [];

    return { uwpEvents, slpEvents };
  }, [events, parties]);

  const allEvents = useMemo(() => [...uwpEvents, ...slpEvents], [uwpEvents, slpEvents]);

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

  const visibleUwpEvents = useMemo(() => filterAndSortEvents(uwpEvents, uwpViewMode), [uwpEvents, uwpViewMode]);
  const visibleSlpEvents = useMemo(() => filterAndSortEvents(slpEvents, slpViewMode), [slpEvents, slpViewMode]);
  const visibleAllEvents = useMemo(() => filterAndSortEvents(allEvents, allEventsViewMode), [allEvents, allEventsViewMode]);


  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Party Events"
        description="Find out about rallies, town halls, and other events from the political parties."
      />
      
      {isLoading ? <EventsPageSkeleton /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>All Events</CardTitle>
                            <CardDescription>All political events.</CardDescription>
                        </div>
                         <div className="flex items-center gap-1 p-1 bg-muted rounded-md">
                            <Button size="sm" variant={allEventsViewMode === 'upcoming' ? 'secondary' : 'ghost'} onClick={() => setAllEventsViewMode('upcoming')}>Upcoming</Button>
                            <Button size="sm" variant={allEventsViewMode === 'past' ? 'secondary' : 'ghost'} onClick={() => setAllEventsViewMode('past')}>Past</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                    {visibleAllEvents.length > 0 ? (
                        visibleAllEvents.map((event) => (
                           <EventCard key={event.id} event={event} partyName={getPartyName(event.partyId)} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No {allEventsViewMode} events found.</p>
                    )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>UWP Events</CardTitle>
                            <CardDescription>Events hosted by the United Workers Party.</CardDescription>
                        </div>
                        <div className="flex items-center gap-1 p-1 bg-muted rounded-md">
                            <Button size="sm" variant={uwpViewMode === 'upcoming' ? 'secondary' : 'ghost'} onClick={() => setUwpViewMode('upcoming')}>Upcoming</Button>
                            <Button size="sm" variant={uwpViewMode === 'past' ? 'secondary' : 'ghost'} onClick={() => setUwpViewMode('past')}>Past</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                    {visibleUwpEvents.length > 0 ? (
                        visibleUwpEvents.map((event) => (
                           <EventCard key={event.id} event={event} partyName={getPartyName(event.partyId)} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No {uwpViewMode} UWP events found.</p>
                    )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>SLP Events</CardTitle>
                            <CardDescription>Events hosted by the Saint Lucia Labour Party.</CardDescription>
                        </div>
                         <div className="flex items-center gap-1 p-1 bg-muted rounded-md">
                            <Button size="sm" variant={slpViewMode === 'upcoming' ? 'secondary' : 'ghost'} onClick={() => setSlpViewMode('upcoming')}>Upcoming</Button>
                            <Button size="sm" variant={slpViewMode === 'past' ? 'secondary' : 'ghost'} onClick={() => setSlpViewMode('past')}>Past</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                    {visibleSlpEvents.length > 0 ? (
                        visibleSlpEvents.map((event) => (
                           <EventCard key={event.id} event={event} partyName={getPartyName(event.partyId)} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No {slpViewMode} SLP events found.</p>
                    )}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
