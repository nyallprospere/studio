
'use client';

import type { Event, Party } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { Calendar, MapPin, Shield, Twitter, Facebook, Share2 } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link';

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
  
  const eventUrl = `https://app.lucianvotes.com/events/${event.id}`;
  const shareText = `Check out this event: ${event.title} on ${format(eventDate, "PPP")}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`;


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
        <DialogFooter className="pr-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Event
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href={twitterShareUrl} target="_blank" rel="noopener noreferrer">
                    <Twitter className="mr-2 h-4 w-4" />
                    Share on Twitter
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={facebookShareUrl} target="_blank" rel="noopener noreferrer">
                    <Facebook className="mr-2 h-4 w-4" />
                    Share on Facebook
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
