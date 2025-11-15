
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StoryForm } from './story-form';
import type { Story, Party, Candidate } from '@/lib/types';
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

function SortableStoryItem({ story, onEdit, onDelete }: { story: Story, onEdit: (story: Story) => void, onDelete: (story: Story) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: story.id });
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
          <p className="font-semibold">{story.authorName}</p>
          <Link href={story.postUrl} target="_blank" className="text-sm text-blue-500 hover:underline truncate max-w-xs block">{story.postUrl}</Link>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(story)}>
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
                This will permanently delete the story from "{story.authorName}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(story)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function AdminStoriesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const storiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'stories'), orderBy('order')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const candidatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);
  
  const { data: stories, isLoading: loadingStories } = useCollection<Story>(storiesQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));
  
  const isLoading = loadingStories || loadingParties || loadingCandidates;
  
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!firestore) return;
    if (active.id !== over.id && stories) {
      const oldIndex = stories.findIndex((r) => r.id === active.id);
      const newIndex = stories.findIndex((r) => r.id === over.id);
      const newOrder = arrayMove(stories, oldIndex, newIndex);
      
      const batch = writeBatch(firestore);
      newOrder.forEach((story, index) => {
        const docRef = doc(firestore, 'stories', story.id);
        batch.update(docRef, { order: index });
      });
      
      try {
        await batch.commit();
        toast({ title: "Order Updated", description: "The order of the stories has been updated." });
      } catch (error) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'stories', operation: 'write'}));
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

    if (editingStory) {
      const storyDoc = doc(firestore, 'stories', editingStory.id);
      await updateDoc(storyDoc, dataToSave);
      toast({ title: "Story Updated", description: "The story has been successfully updated." });
    } else {
      const storiesCollection = collection(firestore, 'stories');
      const newOrder = (stories?.length || 0);
      await addDoc(storiesCollection, { ...dataToSave, order: newOrder });
      toast({ title: "Story Added", description: "The new story has been added." });
    }
    
    setIsFormOpen(false);
    setEditingStory(null);
  };

  const handleDelete = async (story: Story) => {
    if (!firestore) return;
    const storyDoc = doc(firestore, 'stories', story.id);
    await deleteDoc(storyDoc);
    toast({ title: "Story Deleted", description: "The story has been removed." });
  };
  
  const handleDeleteAll = async () => {
    if (!firestore || !stories || stories.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No stories to delete.' });
      return;
    }
    try {
      const batch = writeBatch(firestore);
      const storiesCollection = collection(firestore, 'stories');
      const snapshot = await getDocs(storiesCollection);
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
                <Button variant="destructive" disabled={!stories || stories.length === 0}>
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
                <Button onClick={() => { setEditingStory(null); setIsFormOpen(true) }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Story
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{editingStory ? 'Edit Story' : 'Add New Story'}</DialogTitle>
                </DialogHeader>
                <StoryForm
                onSubmit={handleFormSubmit}
                initialData={editingStory}
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
          ) : stories && stories.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stories} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {stories.map((story) => (
                    <SortableStoryItem key={story.id} story={story} onEdit={setEditingStory} onDelete={handleDelete} />
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
