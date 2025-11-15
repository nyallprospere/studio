'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PostForm } from './post-form';
import type { Post, Party, Candidate } from '@/lib/types';
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

function SortablePostItem({ post, onEdit, onDelete }: { post: Post, onEdit: (post: Post) => void, onDelete: (post: Post) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: post.id });
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
          <p className="font-semibold">{post.authorName}</p>
          <Link href={post.postUrl} target="_blank" className="text-sm text-blue-500 hover:underline truncate max-w-xs block">{post.postUrl}</Link>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(post)}>
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
                This will permanently delete the post from "{post.authorName}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(post)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function AdminPostsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const postsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'posts'), orderBy('order')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const candidatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);
  
  const { data: posts, isLoading: loadingPosts } = useCollection<Post>(postsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));
  
  const isLoading = loadingPosts || loadingParties || loadingCandidates;
  
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!firestore) return;
    if (active.id !== over.id && posts) {
      const oldIndex = posts.findIndex((r) => r.id === active.id);
      const newIndex = posts.findIndex((r) => r.id === over.id);
      const newOrder = arrayMove(posts, oldIndex, newIndex);
      
      const batch = writeBatch(firestore);
      newOrder.forEach((post, index) => {
        const docRef = doc(firestore, 'posts', post.id);
        batch.update(docRef, { order: index });
      });
      
      try {
        await batch.commit();
        toast({ title: "Order Updated", description: "The order of the posts has been updated." });
      } catch (error) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'posts', operation: 'write'}));
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

    if (editingPost) {
      const postDoc = doc(firestore, 'posts', editingPost.id);
      await updateDoc(postDoc, dataToSave);
      toast({ title: "Post Updated", description: "The post has been successfully updated." });
    } else {
      const postsCollection = collection(firestore, 'posts');
      const newOrder = (posts?.length || 0);
      await addDoc(postsCollection, { ...dataToSave, order: newOrder });
      toast({ title: "Post Added", description: "The new post has been added." });
    }
    
    setIsFormOpen(false);
    setEditingPost(null);
  };

  const handleDelete = async (post: Post) => {
    if (!firestore) return;
    const postDoc = doc(firestore, 'posts', post.id);
    await deleteDoc(postDoc);
    toast({ title: "Post Deleted", description: "The post has been removed." });
  };
  
  const handleDeleteAll = async () => {
    if (!firestore || !posts || posts.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No posts to delete.' });
      return;
    }
    try {
      const batch = writeBatch(firestore);
      const postsCollection = collection(firestore, 'posts');
      const snapshot = await getDocs(postsCollection);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      toast({ title: 'All Posts Deleted', description: 'All Facebook posts have been removed.' });
    } catch (error) {
      console.error('Error deleting all posts:', error);
      toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete all posts.' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Facebook Posts"
          description="Add, edit, and reorder the Facebook Posts displayed on the homepage."
        />
        <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!posts || posts.length === 0}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all Facebook posts. This action cannot be undone.
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
                <Button onClick={() => { setEditingPost(null); setIsFormOpen(true) }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Post
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{editingPost ? 'Edit Post' : 'Add New Post'}</DialogTitle>
                </DialogHeader>
                <PostForm
                onSubmit={handleFormSubmit}
                initialData={editingPost}
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
          <CardTitle>Post Order</CardTitle>
          <CardDescription>Drag and drop the posts to reorder them on the homepage.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading posts...</p>
          ) : posts && posts.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={posts} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <SortablePostItem key={post.id} post={post} onEdit={setEditingPost} onDelete={handleDelete} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-center text-muted-foreground py-8">No posts have been added yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
