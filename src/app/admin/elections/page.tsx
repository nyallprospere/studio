
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, CollectionReference } from 'firebase/firestore';
import type { Election } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ElectionForm } from './election-form';
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

export default function AdminElectionsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const { data: elections, isLoading } = useCollection<Election>(electionsQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);

  const sortedElections = useMemo(() => {
    if (!elections) return [];
    return [...elections].sort((a, b) => {
        if (a.year !== b.year) {
            return b.year - a.year;
        }
        return b.name.localeCompare(a.name);
    });
  }, [elections]);

  const handleFormSubmit = async (values: any) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }
    const electionData = { ...values };

    if (editingElection) {
      const electionDoc = doc(firestore, 'elections', editingElection.id);
      updateDoc(electionDoc, electionData)
        .then(() => {
          toast({ title: "Election Updated", description: `The ${electionData.name} has been successfully updated.` });
        })
        .catch(error => {
          const contextualError = new FirestorePermissionError({
            path: electionDoc.path,
            operation: 'update',
            requestResourceData: electionData,
          });
          errorEmitter.emit('permission-error', contextualError);
        });
    } else {
      const electionsCollection = collection(firestore, 'elections');
      addDoc(electionsCollection, electionData)
        .then(() => {
          toast({ title: "Election Added", description: `The ${electionData.name} has been successfully added.` });
        })
        .catch(error => {
          const contextualError = new FirestorePermissionError({
            path: (electionsCollection as CollectionReference).path,
            operation: 'create',
            requestResourceData: electionData,
          });
          errorEmitter.emit('permission-error', contextualError);
        });
    }
    
    setIsFormOpen(false);
    setEditingElection(null);
  };

  const handleDelete = async (election: Election) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }
    const electionDoc = doc(firestore, 'elections', election.id);
    deleteDoc(electionDoc)
      .then(() => {
        toast({ title: "Election Deleted", description: `The ${election.name} has been deleted.` });
      })
      .catch(error => {
        const contextualError = new FirestorePermissionError({
          path: electionDoc.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Elections"
          description="Add, edit, or remove election years."
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingElection(null); setIsFormOpen(true)}}>Add New Election</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingElection ? 'Edit Election' : 'Add New Election'}</DialogTitle>
            </DialogHeader>
            <ElectionForm
              onSubmit={handleFormSubmit}
              initialData={editingElection}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Elections</CardTitle>
          <CardDescription>A list of all elections currently in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading elections...</p>
          ) : (
            <div className="space-y-4">
              {sortedElections && sortedElections.length > 0 ? (
                sortedElections.map((election) => (
                  <div key={election.id} className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
                    <div>
                      <p className="font-semibold">{election.name}</p>
                      <p className="text-sm text-muted-foreground">Year: {election.year}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" onClick={() => { setEditingElection(election); setIsFormOpen(true);}}>
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
                                This will permanently delete the election "{election.name}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(election)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No elections have been added yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
