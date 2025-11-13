'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Event, Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EventForm } from './event-form';
import { Pencil, Trash2, Calendar, MapPin, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { uploadFile, deleteFile } from '@/firebase/storage';
import Image from 'next/image';

export default function AdminEventsPage() {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  
  const { data: events, isLoading: loadingEvents, error: errorEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [preselectedPartyId, setPreselectedPartyId] = useState<string | undefined>(undefined);
  
  const getParty = (partyId: string) => parties?.find(p => p.id === partyId);
  const isLoading = loadingEvents || loadingParties;

  const { uwpEvents, slpEvents, uwpParty, slpParty } = useMemo(() => {
    if (!events || !parties) {
      return { uwpEvents: [], slpEvents: [], uwpParty: null, slpParty: null };
    }
    const uwp = parties.find(p => p.acronym === 'UWP');
    const slp = parties.find(p => p.acronym === 'SLP');
    
    const uwpEvents = uwp ? events.filter(e => e.partyId === uwp.id) : [];
    const slpEvents = slp ? events.filter(e => e.partyId === slp.id) : [];

    return { uwpEvents, slpEvents, uwpParty: uwp, slpParty: slp };
  }, [events, parties]);

  const handleFormSubmit = async (values: any) => {
    if (!firestore) return;
    try {
      let imageUrl = values.imageUrl;
      if (values.photoFile) {
          if (editingEvent?.imageUrl) {
              await deleteFile(editingEvent.imageUrl);
          }
          imageUrl = await uploadFile(values.photoFile, `events/${values.photoFile.name}`);
      }

      const eventData = { 
        ...values, 
        date: Timestamp.fromDate(values.date),
        imageUrl,
      };
      delete eventData.photoFile;

      if (editingEvent) {
        const eventDoc = doc(firestore, 'events', editingEvent.id);
        await updateDoc(eventDoc, eventData);
        toast({ title: "Event Updated", description: `The event "${eventData.title}" has been successfully updated.` });
      } else {
        const eventsCollection = collection(firestore, 'events');
        await addDoc(eventsCollection, eventData);
        toast({ title: "Event Added", description: `The event "${eventData.title}" has been successfully added.` });
      }
    } catch (error) {
      console.error("Error saving event: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save event. Check console for details." });
    } finally {
      setIsFormOpen(false);
      setEditingEvent(null);
      setPreselectedPartyId(undefined);
    }
  };

  const handleDelete = async (event: Event) => {
    if (!firestore) return;
    try {
      if (event.imageUrl) await deleteFile(event.imageUrl);
      const eventDoc = doc(firestore, 'events', event.id);
      await deleteDoc(eventDoc);
      toast({ title: "Event Deleted", description: `The event "${event.title}" has been deleted.` });
    } catch (error) {
        console.error("Error deleting event: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete event." });
    }
  };

  const openForm = (partyId?: string, event: Event | null = null) => {
    setPreselectedPartyId(partyId);
    setEditingEvent(event);
    setIsFormOpen(true);
  }

  return (
    <div className="container mx-auto px-4 py-8">
    <div className="flex justify-between items-start mb-8">
        <PageHeader
        title="Manage Events"
        description="Add, edit, or remove party events."
        />
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
            setEditingEvent(null);
            setPreselectedPartyId(undefined);
            }
            setIsFormOpen(isOpen);
        }}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            </DialogHeader>
            <EventForm
            onSubmit={handleFormSubmit}
            initialData={editingEvent}
            onCancel={() => setIsFormOpen(false)}
            parties={parties || []}
            preselectedPartyId={preselectedPartyId}
            />
        </DialogContent>
        </Dialog>
    </div>

    <div className="grid md:grid-cols-2 gap-8">
    <Card>
        <CardHeader>
        <div className="flex justify-between items-center">
            <div>
            <CardTitle>UWP Events</CardTitle>
            <CardDescription>A list of all UWP events currently in the system.</CardDescription>
            </div>
            {uwpParty && <Button onClick={() => openForm(uwpParty.id)}>Add UWP Event</Button>}
        </div>
        </CardHeader>
        <CardContent>
        {isLoading ? (
            <p>Loading events...</p>
        ) : errorEvents ? (
            <div className="text-red-600 bg-red-100 p-4 rounded-md">
                <h3 className="font-bold">Error loading events</h3>
                <p>{errorEvents.message}</p>
                <p className="text-sm mt-2">Please check the Firestore security rules and console for more details.</p>
            </div>
        ) : (
            <div className="space-y-4">
            {uwpEvents && uwpEvents.length > 0 ? (
                uwpEvents.map((event) => {
                const eventDate = (event.date as unknown as Timestamp)?.toDate ? (event.date as unknown as Timestamp).toDate() : new Date(event.date);
                const party = getParty(event.partyId);
                return (
                <div key={event.id} className="flex items-start justify-between p-4 border rounded-md hover:bg-muted/50 gap-4">
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
                        {party && <p className="flex items-center gap-2"><Shield className="h-4 w-4" /> {party.name}</p>}
                        <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {format(eventDate, "PPP")}</p>
                        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location}</p>
                    </div>
                    </div>
                    <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openForm(undefined, event)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the event "{event.title}". This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(event)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                );
                })
            ) : (
                <p className="text-center text-muted-foreground py-8">No UWP events have been added yet.</p>
            )}
            </div>
        )}
        </CardContent>
    </Card>
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>SLP Events</CardTitle>
                    <CardDescription>A list of all SLP events currently in the system.</CardDescription>
                </div>
                {slpParty && <Button onClick={() => openForm(slpParty.id)}>Add SLP Event</Button>}
            </div>
        </CardHeader>
        <CardContent>
        {isLoading ? (
            <p>Loading events...</p>
        ) : errorEvents ? (
            <div className="text-red-600 bg-red-100 p-4 rounded-md">
                <h3 className="font-bold">Error loading events</h3>
                <p>{errorEvents.message}</p>
                <p className="text-sm mt-2">Please check the Firestore security rules and console for more details.</p>
            </div>
        ) : (
            <div className="space-y-4">
            {slpEvents && slpEvents.length > 0 ? (
                slpEvents.map((event) => {
                const eventDate = (event.date as unknown as Timestamp)?.toDate ? (event.date as unknown as Timestamp).toDate() : new Date(event.date);
                const party = getParty(event.partyId);
                return (
                <div key={event.id} className="flex items-start justify-between p-4 border rounded-md hover:bg-muted/50 gap-4">
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
                        {party && <p className="flex items-center gap-2"><Shield className="h-4 w-4" /> {party.name}</p>}
                        <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {format(eventDate, "PPP")}</p>
                        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location}</p>
                    </div>
                    </div>
                    <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openForm(undefined, event)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the event "{event.title}". This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(event)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                );
                })
            ) : (
                <p className="text-center text-muted-foreground py-8">No SLP events have been added yet.</p>
            )}
            </div>
        )}
        </CardContent>
    </Card>
    </div>
    </div>
  );
}
