'use client';

import { useState } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import type { Candidate, Party, Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CandidateForm } from './candidate-form';
import Image from 'next/image';
import { UserSquare, Pencil, Trash2 } from 'lucide-react';
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
import { uploadFile, deleteFile } from '@/firebase/storage';
import { useToast } from '@/hooks/use-toast';

export default function AdminCandidatesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const candidatesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesCollection);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesCollection);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  const handleFormSubmit = async (values: any) => {
    try {
      let imageUrl = values.imageUrl;
      if (values.photoFile) {
        if(editingCandidate?.imageUrl) {
            await deleteFile(editingCandidate.imageUrl);
        }
        imageUrl = await uploadFile(values.photoFile, `candidates/${values.photoFile.name}`);
      }
      
      const candidateData = { ...values, imageUrl };
      delete candidateData.photoFile;

      if (editingCandidate) {
        const candidateDoc = doc(firestore, 'candidates', editingCandidate.id);
        await updateDoc(candidateDoc, candidateData);
        toast({ title: "Candidate Updated", description: `${candidateData.firstName} ${candidateData.lastName} has been successfully updated.` });
      } else {
        await addDoc(candidatesCollection, candidateData);
        toast({ title: "Candidate Added", description: `${candidateData.firstName} ${candidateData.lastName} has been successfully added.` });
      }
    } catch (error) {
      console.error("Error saving candidate: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save candidate. Check console for details." });
    } finally {
      setIsFormOpen(false);
      setEditingCandidate(null);
    }
  };

  const handleDelete = async (candidate: Candidate) => {
    try {
      if (candidate.imageUrl) await deleteFile(candidate.imageUrl);
      
      const candidateDoc = doc(firestore, 'candidates', candidate.id);
      await deleteDoc(candidateDoc);
      toast({ title: "Candidate Deleted", description: `${candidate.firstName} ${candidate.lastName} has been deleted.` });
    } catch (error) {
        console.error("Error deleting candidate: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete candidate." });
    }
  };

  const getPartyName = (partyId: string) => parties?.find(p => p.id === partyId)?.name || 'N/A';
  const getConstituencyName = (constituencyId: string) => constituencies?.find(c => c.id === constituencyId)?.name || 'N/A';
  const isLoading = loadingCandidates || loadingParties || loadingConstituencies;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Candidates"
          description="Add, edit, or remove election candidates."
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCandidate(null); setIsFormOpen(true)}}>Add New Candidate</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}</DialogTitle>
            </DialogHeader>
            <CandidateForm
              onSubmit={handleFormSubmit}
              initialData={editingCandidate}
              onCancel={() => setIsFormOpen(false)}
              parties={parties || []}
              constituencies={constituencies || []}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Candidates</CardTitle>
          <CardDescription>A list of all candidates currently in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading candidates...</p>
          ) : (
            <div className="space-y-4">
              {candidates && candidates.length > 0 ? (
                candidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      {candidate.imageUrl ? (
                        <Image src={candidate.imageUrl} alt={`${candidate.firstName} ${candidate.lastName}`} width={48} height={48} className="rounded-full object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <UserSquare className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{candidate.firstName} {candidate.lastName}</p>
                        <p className="text-sm text-muted-foreground">
                          {getPartyName(candidate.partyId)} &bull; {getConstituencyName(candidate.constituencyId)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" onClick={() => { setEditingCandidate(candidate); setIsFormOpen(true);}}>
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
                                This will permanently delete the candidate "{candidate.firstName} {candidate.lastName}" and all associated data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(candidate)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No candidates have been added yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
