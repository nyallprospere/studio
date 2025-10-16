'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
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
        // For elections in the same year, sort by name descending to get "April 30" before "April 6"
        return b.name.localeCompare(a.name);
    });
  }, [elections]);

  const handleFormSubmit = async (values: any) => {
    try {
      const electionData = { ...values };

      if (editingElection) {
        const electionDoc = doc(firestore, 'elections', editingElection.id);
        await updateDoc(electionDoc, electionData);
        toast({ title: "Election Updated", description: `The ${electionData.name} has been successfully updated.` });
      } else {
        const electionsCollection = collection(firestore, 'elections');
        await addDoc(electionsCollection, electionData);
        toast({ title: "Election Added", description: `The ${electionData.name} has been successfully added.` });
      }
    } catch (error) {
      console.error("Error saving election: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save election. Check console for details." });
    } finally {
      setIsFormOpen(false);
      setEditingElection(null);
    }
  };

  const handleDelete = async (election: Election) => {
    try {
      const electionDoc = doc(firestore, 'elections', election.id);
      await deleteDoc(electionDoc);
      toast({ title: "Election Deleted", description: `The ${election.name} has been deleted.` });
    } catch (error) {
        console.error("Error deleting election: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete election." });
    }
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
