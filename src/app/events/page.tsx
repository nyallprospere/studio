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
import { MainLayout } from '@/components/layout/main-layout';


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
  const [uwpViewMode, setUwpViewMode] = useState<'upcoming' | 'past'>('upcoming');
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  
  const { data: events, isLoading: loadingEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  
  const getParty = (partyId: string) => parties?.find(p => p.id === partyId);
  const isLoading = loadingEvents || loadingParties;

  const { uwpEvents, uwpParty } = useMemo(() => {
    if (!events || !parties) {
      return { uwpEvents: [], uwpParty: null };
    }
    const uwp = parties.find(p => p.acronym === 'UWP');
    
    const uwpEvents = uwp ? events.filter(e => e.partyId === uwp.id) : [];

    return { uwpEvents, uwpParty: uwp };
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

  const visibleUwpEvents = useMemo(() => filterAndSortEvents(uwpEvents, uwpViewMode), [uwpEvents, uwpViewMode]);


  return (
    <MainLayout>
        <div className="container mx-auto px-4 py-8">
        <PageHeader
            title="UWP Events"
            description="Find out about rallies, town halls, and other events from the United Workers Party."
        />
        
        {isLoading ? <EventsPageSkeleton /> : (
            <div className="grid md:grid-cols-1 gap-8">
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
                            <EventCard key={event.id} event={event} party={uwpParty || undefined} />
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No {uwpViewMode} UWP events found.</p>
                        )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
        </div>
    </MainLayout>
  );
}
