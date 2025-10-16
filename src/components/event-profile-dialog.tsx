
'use client';

import type { Event, Party } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Calendar, MapPin, Shield } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface EventProfileDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventProfileDialog({ event, isOpen, onClose }: EventProfileDialogProps) {
  const { firestore } = useFirebase();

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const { data: parties } = useCollection<Party>(partiesQuery);

  if (!event) {
    return null;
  }

  const party = parties?.find(p => p.id === event.partyId);
  const eventDate = (event.date as unknown as Timestamp)?.toDate ? (event.date as unknown as Timestamp).toDate() : new Date(event.date);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[70vh]">
        <ScrollArea className="h-full pr-6">
          {event.imageUrl && (
            <div className="relative h-64 w-full mb-4 rounded-lg overflow-hidden">
              <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl">{event.title}</DialogTitle>
            <div className="space-y-2 pt-2 text-md">
                 {party && (
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold" style={{ color: party.color }}>{party.name}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>{format(eventDate, "EEEE, MMMM do, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{event.location}</span>
                </div>
            </div>
          </DialogHeader>

          {event.description && (
            <div className="mt-6">
                <h4 className="font-semibold text-base mb-2 uppercase tracking-wider text-muted-foreground">About the Event</h4>
                <p className="whitespace-pre-line text-foreground text-sm">{event.description}</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
