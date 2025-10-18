
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Event, Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventCard } from '@/components/event-card';


function EventsPageSkeleton() {
    return (
         <div className="grid md:grid-cols-2 gap-8">
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
  const [slpViewMode, setSlpViewMode] = useState<'upcoming' | 'past'>('upcoming');
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  
  const { data: events, isLoading: loadingEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  
  const getParty = (partyId: string) => parties?.find(p => p.id === partyId);
  const isLoading = loadingEvents || loadingParties;

  const { slpEvents, slpParty } = useMemo(() => {
    if (!events || !parties) {
      return { slpEvents: [], slpParty: null };
    }
    const slp = parties.find(p => p.acronym === 'SLP');
    
    const slpEvents = slp ? events.filter(e => e.partyId === slp.id) : [];

    return { slpEvents, slpParty: slp };
  }, [events, parties]);


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

  const visibleSlpEvents = useMemo(() => filterAndSortEvents(slpEvents, slpViewMode), [slpEvents, slpViewMode]);


  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="SLP Events"
        description="Find out about rallies, town halls, and other events from the Saint Lucia Labour Party."
      />
      
      {isLoading ? <EventsPageSkeleton /> : (
          <div className="grid md:grid-cols-1 gap-8">
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
                           <EventCard key={event.id} event={event} party={slpParty || undefined} />
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
