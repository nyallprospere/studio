
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ReelForm } from './reel-form';
import type { Reel, Party, Candidate } from '@/lib/types';
import { Pencil, Trash2, PlusCircle, GripVertical } from 'lucide-react';
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
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';

function SortableReelItem({ reel, onEdit, onDelete, authorName }: { reel: Reel, onEdit: (reel: Reel) => void, onDelete: (reel: Reel) => void, authorName: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: reel.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="cursor-grab touch-none">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">{authorName}</p>
          <Link href={reel.postUrl} target="_blank" className="text-sm text-blue-500 hover:underline truncate max-w-xs block">{reel.postUrl}</Link>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(reel)}>
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
                This will permanently delete the story from "{authorName}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(reel)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function AdminReelsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const reelsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'reels'), orderBy('order')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const candidatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);
  
  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReel, setEditingReel] = useState<Reel | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));
  
  const isLoading = loadingReels || loadingParties || loadingCandidates;
  
  const getAuthorName = (reel: Reel) => {
    if (reel.candidateId) {
      const candidate = candidates?.find(c => c.id === reel.candidateId);
      if (candidate) return candidate.name;
    }
    if (reel.partyId) {
      const party = parties?.find(p => p.id === reel.partyId);
      if (party) return party.name;
    }
    return reel.authorUrl;
  }


  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!firestore) return;
    if (active.id !== over.id && reels) {
      const oldIndex = reels.findIndex((r) => r.id === active.id);
      const newIndex = reels.findIndex((r) => r.id === over.id);
      const newOrder = arrayMove(reels, oldIndex, newIndex);
      
      const batch = writeBatch(firestore);
      newOrder.forEach((reel, index) => {
        const docRef = doc(firestore, 'reels', reel.id);
        batch.update(docRef, { order: index });
      });
      
      try {
        await batch.commit();
        toast({ title: "Order Updated", description: "The order of the stories has been updated." });
      } catch (error) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'reels', operation: 'write'}));
      }
    }
  };

  const handleFormSubmit = async (values: any) => {
    if (!firestore) return;
    
    let authorName = '';
    if (values.candidateId) {
        const candidate = candidates?.find(c => c.id === values.candidateId);
        authorName = candidate?.name || '';
    } else if (values.partyId) {
        const party = parties?.find(p => p.id === values.partyId);
        authorName = party?.name || '';
    }
    
    const dataToSave = { ...values, authorName };

    if (editingReel) {
      const reelDoc = doc(firestore, 'reels', editingReel.id);
      await updateDoc(reelDoc, dataToSave);
      toast({ title: "Story Updated", description: "The story has been successfully updated." });
    } else {
      const reelsCollection = collection(firestore, 'reels');
      const newOrder = (reels?.length || 0);
      await addDoc(reelsCollection, { ...dataToSave, order: newOrder });
      toast({ title: "Story Added", description: "The new story has been added." });
    }
    
    setIsFormOpen(false);
    setEditingReel(null);
  };

  const handleDelete = async (reel: Reel) => {
    if (!firestore) return;
    const reelDoc = doc(firestore, 'reels', reel.id);
    await deleteDoc(reelDoc);
    toast({ title: "Story Deleted", description: "The story has been removed." });
  };
  
  const handleDeleteAll = async () => {
    if (!firestore || !reels || reels.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No stories to delete.' });
      return;
    }
    try {
      const batch = writeBatch(firestore);
      const reelsCollection = collection(firestore, 'reels');
      const snapshot = await getDocs(reelsCollection);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      toast({ title: 'All Stories Deleted', description: 'All Facebook stories have been removed.' });
    } catch (error) {
      console.error('Error deleting all stories:', error);
      toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete all stories.' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Facebook Stories"
          description="Add, edit, and reorder the Facebook Stories displayed on the homepage."
        />
        <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!reels || reels.length === 0}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all Facebook stories. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => { setEditingReel(null); setIsFormOpen(true) }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Story
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{editingReel ? 'Edit Story' : 'Add New Story'}</DialogTitle>
                </DialogHeader>
                <ReelForm
                onSubmit={handleFormSubmit}
                initialData={editingReel}
                onCancel={() => setIsFormOpen(false)}
                parties={parties || []}
                candidates={candidates || []}
                />
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Story Order</CardTitle>
          <CardDescription>Drag and drop the stories to reorder them on the homepage.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading stories...</p>
          ) : reels && reels.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={reels} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {reels.map((reel) => (
                    <SortableReelItem key={reel.id} reel={reel} onEdit={setEditingReel} onDelete={handleDelete} authorName={getAuthorName(reel)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-center text-muted-foreground py-8">No stories have been added yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
