
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
import { Pencil, Trash2 } from 'lucide-react';
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

export default function AdminEventsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  
  const { data: events, isLoading: loadingEvents, error: errorEvents } = useCollection<Event>(eventsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  const getPartyName = (partyId: string) => parties?.find(p => p.id === partyId)?.name || 'N/A';
  const isLoading = loadingEvents || loadingParties;

  const handleFormSubmit = async (values: any) => {
    if (!firestore) return;
    try {
      // Convert JS Date to Firestore Timestamp
      const eventData = { 
        ...values, 
        date: Timestamp.fromDate(values.date)
      };

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
    }
  };

  const handleDelete = async (event: Event) => {
    if (!firestore) return;
    try {
      const eventDoc = doc(firestore, 'events', event.id);
      await deleteDoc(eventDoc);
      toast({ title: "Event Deleted", description: `The event "${event.title}" has been deleted.` });
    } catch (error) {
        console.error("Error deleting event: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete event." });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Events"
          description="Add, edit, or remove party events."
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEvent(null); setIsFormOpen(true)}}>Add New Event</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            </DialogHeader>
            <EventForm
              onSubmit={handleFormSubmit}
              initialData={editingEvent}
              onCancel={() => setIsFormOpen(false)}
              parties={parties || []}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Events</CardTitle>
          <CardDescription>A list of all party events currently in the system.</CardDescription>
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
              {events && events.length > 0 ? (
                events.map((event) => {
                  // Firestore timestamps need to be converted to JS Dates
                  const eventDate = (event.date as unknown as Timestamp)?.toDate ? (event.date as unknown as Timestamp).toDate() : new Date(event.date);
                  return (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {getPartyName(event.partyId)} &bull; {format(eventDate, "PPP")} &bull; {event.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" onClick={() => { setEditingEvent(event); setIsFormOpen(true);}}>
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
                <p className="text-center text-muted-foreground py-8">No events have been added yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Existing Events</CardTitle>
          <CardDescription>A list of all party events currently in the system.</CardDescription>
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
              {events && events.length > 0 ? (
                events.map((event) => {
                  // Firestore timestamps need to be converted to JS Dates
                  const eventDate = (event.date as unknown as Timestamp)?.toDate ? (event.date as unknown as Timestamp).toDate() : new Date(event.date);
                  return (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {getPartyName(event.partyId)} &bull; {format(eventDate, "PPP")} &bull; {event.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" onClick={() => { setEditingEvent(event); setIsFormOpen(true);}}>
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
                <p className="text-center text-muted-foreground py-8">No events have been added yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
