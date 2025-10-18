
'use client';

import { useState } from 'react';
import type { Event, Party } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Calendar, MapPin, Shield, ArrowRight } from 'lucide-react';
import { EventProfileDialog } from '@/components/event-profile-dialog';

export function EventCard({ event, party }: { event: Event, party: Party | undefined }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const eventDate = (event.date as unknown as Timestamp)?.toDate ? (event.date as unknown as Timestamp).toDate() : new Date(event.date);
    
    return (
        <>
            <Card 
                className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full" 
                onClick={() => setIsDialogOpen(true)}
                style={{ borderTop: `4px solid ${party?.color || 'hsl(var(--border))'}` }}
            >
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
                            <div className="flex items-center gap-2">
                                {party?.logoUrl ? (
                                    <Image src={party.logoUrl} alt={`${party.name} logo`} width={16} height={16} className="rounded-full object-contain" />
                                ) : (
                                    <Shield className="h-4 w-4" />
                                )}
                                <span>{party?.name || 'Event'}</span>
                            </div>
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
