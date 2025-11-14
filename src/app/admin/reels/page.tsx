
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
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

function SortableReelItem({ reel, onEdit, onDelete }: { reel: Reel, onEdit: (reel: Reel) => void, onDelete: (reel: Reel) => void }) {
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
          <p className="font-semibold">{reel.authorName}</p>
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
                This will permanently delete the reel from "{reel.authorName}". This action cannot be undone.
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
        toast({ title: "Order Updated", description: "The order of the reels has been updated." });
      } catch (error) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'reels', operation: 'write'}));
      }
    }
  };

  const handleFormSubmit = async (values: any) => {
    if (!firestore) return;
    
    if (editingReel) {
      const reelDoc = doc(firestore, 'reels', editingReel.id);
      await updateDoc(reelDoc, values);
      toast({ title: "Reel Updated", description: "The reel has been successfully updated." });
    } else {
      const reelsCollection = collection(firestore, 'reels');
      const newOrder = (reels?.length || 0);
      await addDoc(reelsCollection, { ...values, order: newOrder });
      toast({ title: "Reel Added", description: "The new reel has been added." });
    }
    
    setIsFormOpen(false);
    setEditingReel(null);
  };

  const handleDelete = async (reel: Reel) => {
    if (!firestore) return;
    const reelDoc = doc(firestore, 'reels', reel.id);
    await deleteDoc(reelDoc);
    toast({ title: "Reel Deleted", description: "The reel has been removed." });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Reels"
          description="Add, edit, and reorder the Facebook Reels displayed on the homepage."
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingReel(null); setIsFormOpen(true) }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Reel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingReel ? 'Edit Reel' : 'Add New Reel'}</DialogTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Reel Order</CardTitle>
          <CardDescription>Drag and drop the reels to reorder them on the homepage.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading reels...</p>
          ) : reels && reels.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={reels} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {reels.map((reel) => (
                    <SortableReelItem key={reel.id} reel={reel} onEdit={setEditingReel} onDelete={handleDelete} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-center text-muted-foreground py-8">No reels have been added yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
