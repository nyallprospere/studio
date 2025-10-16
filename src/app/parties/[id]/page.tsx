
'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { Party, Candidate, Constituency, Event } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Shield, Link as LinkIcon, UserSquare, CalendarIcon, MapPin } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, limit, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

function PartyPageSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
         <Skeleton className="h-6 w-28" />
         <Skeleton className="h-6 w-24" />
      </CardFooter>
    </Card>
  );
}

function EventCard({ event }: { event: Event }) {
    return (
        <div className="border-l-2 pl-4 py-2">
            <p className="font-semibold">{event.title}</p>
            <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{format(new Date(event.date), "PPP")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                </div>
            </div>
            {event.description && <p className="text-sm mt-2">{event.description}</p>}
        </div>
    );
}

export default function PartyDetailPage() {
  const { id } = useParams();
  const { firestore } = useFirebase();
  const partyId = Array.isArray(id) ? id[0] : id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const partyRef = useMemoFirebase(() => (firestore && partyId ? doc(firestore, 'parties', partyId) : null), [firestore, partyId]);
  const { data: party, isLoading: loadingParty } = useDoc<Party>(partyRef);

  const leaderQuery = useMemoFirebase(() => (firestore && partyId ? query(collection(firestore, 'candidates'), where('partyId', '==', partyId), where('isPartyLeader', '==', true), limit(1)) : null), [firestore, partyId]);
  const { data: leaderData, isLoading: loadingLeader } = useCollection<Candidate>(leaderQuery);
  const leader = leaderData?.[0];

  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

  const eventsQuery = useMemoFirebase(() => (firestore && partyId ? query(collection(firestore, 'events'), where('partyId', '==', partyId), orderBy('date', 'desc')) : null), [firestore, partyId]);
  const { data: events, isLoading: loadingEvents } = useCollection<Event>(eventsQuery);

  const { upcomingEvents, pastEvents } = useMemo(() => {
    if (!events) return { upcomingEvents: [], pastEvents: [] };
    const upcoming = events.filter(e => new Date(e.date) >= today);
    const past = events.filter(e => new Date(e.date) < today);
    return { upcomingEvents: upcoming.reverse(), pastEvents: past }; // Show nearest upcoming event first
  }, [events, today]);
  

  const leaderConstituency = useMemo(() => {
    if (leader && constituencies) {
        return constituencies.find(c => c.id === leader.constituencyId);
    }
    return null;
  }, [leader, constituencies]);

  const isLoading = loadingParty || loadingLeader || loadingConstituencies || loadingEvents;

  if (isLoading || !party) {
    return (
        <div className="container mx-auto px-4 py-8">
            <PartyPageSkeleton />
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card className="flex flex-col overflow-hidden h-full" style={{ borderTop: `4px solid ${party.color}` }}>
                    <CardHeader className="flex flex-row items-start gap-4">
                        {party.logoUrl ? (
                            <div className="relative h-16 w-16 flex-shrink-0">
                                <Image src={party.logoUrl} alt={`${party.name} logo`} fill className="rounded-full object-contain" />
                            </div>
                        ) : (
                            <div className="h-16 w-16 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                                <Shield className="w-8 h-8 text-muted-foreground" />
                            </div>
                        )}
                        <div>
                        <CardTitle className="font-headline text-2xl">{party.name} ({party.acronym})</CardTitle>
                        <CardDescription>Founded in {party.founded}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-6">
                        <div>
                            <h4 className="font-semibold text-sm mb-1 uppercase tracking-wider text-muted-foreground">About the Party</h4>
                            <p className="text-sm text-foreground whitespace-pre-line">{party.description || 'No description available.'}</p>
                        </div>
                        {party.history && (
                        <div>
                            <h4 className="font-semibold text-sm mb-1 uppercase tracking-wider text-muted-foreground">Party History</h4>
                            <p className="text-sm text-foreground whitespace-pre-line">{party.history}</p>
                        </div>
                        )}
                        <div>
                            <h4 className="font-semibold text-sm mb-1 uppercase tracking-wider text-muted-foreground">Manifesto Summary</h4>
                            <p className="text-sm text-foreground whitespace-pre-line">{party.manifestoSummary || 'No summary available.'}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-wrap gap-2 bg-muted/50 p-4">
                        {party.manifestoUrl && (
                            <Link href={party.manifestoUrl} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline">View Full Manifesto (PDF)</Badge>
                            </Link>
                        )}
                        {party.website && (
                            <Link href={party.website} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <LinkIcon className="h-3 w-3" />
                                    Visit Website
                                </Badge>
                            </Link>
                        )}
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Tabs defaultValue="upcoming">
                            <TabsList>
                                <TabsTrigger value="upcoming">Upcoming ({upcomingEvents.length})</TabsTrigger>
                                <TabsTrigger value="past">Past ({pastEvents.length})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="upcoming" className="pt-4">
                                {upcomingEvents.length > 0 ? (
                                    <div className="space-y-4">
                                        {upcomingEvents.map(event => <EventCard key={event.id} event={event} />)}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">No upcoming events scheduled.</p>
                                )}
                            </TabsContent>
                            <TabsContent value="past" className="pt-4">
                               {pastEvents.length > 0 ? (
                                    <div className="space-y-4">
                                        {pastEvents.map(event => <EventCard key={event.id} event={event} />)}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">No past events found.</p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
             <div className="space-y-8">
                {leader && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Party Leader</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/candidates/${leader.id}`} className="flex flex-col items-center text-center gap-4 group">
                                <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted">
                                {leader.imageUrl ? (
                                    <Image src={leader.imageUrl} alt={`Photo of ${leader.firstName} ${leader.lastName}`} fill className="object-cover group-hover:scale-105 transition-transform" />
                                ) : (
                                    <UserSquare className="h-full w-full text-muted-foreground" />
                                )}
                                </div>
                                <div>
                                    <p className="font-bold text-lg group-hover:text-primary transition-colors">{leader.firstName} {leader.lastName}</p>
                                    {leaderConstituency && (
                                        <p className="text-sm text-muted-foreground">Candidate for {leaderConstituency.name}</p>
                                    )}
                                </div>
                            </Link>
                        </CardContent>
                    </Card>
                )}
             </div>
        </div>
    </div>
  );
}

    