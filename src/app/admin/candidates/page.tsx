
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import type { Candidate, Party, Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CandidateForm } from './candidate-form';
import { ImportDialog } from './import-dialog';
import Image from 'next/image';
import { UserSquare, Pencil, Trash2, Upload, Download } from 'lucide-react';
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
import * as XLSX from 'xlsx';


export default function AdminCandidatesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const candidatesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  
  const { data: candidates, isLoading: loadingCandidates, error: errorCandidates } = useCollection<Candidate>(candidatesCollection);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesCollection);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [partyFilter, setPartyFilter] = useState<string | null>(null);

  const handleFormSubmit = async (values: any) => {
    if (!firestore) return;
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
    if (!firestore) return;
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
  
  const handleExport = () => {
    if (!candidates || !parties || !constituencies) {
      toast({ variant: "destructive", title: "Error", description: "Data not loaded yet." });
      return;
    }
    const dataToExport = candidates.map(c => ({
      'First Name': c.firstName,
      'Last Name': c.lastName,
      'Party': getPartyName(c.partyId),
      'Constituency': getConstituencyName(c.constituencyId),
      'Bio': c.bio,
      'Is Incumbent': c.isIncumbent ? 'Yes' : 'No',
      'Is Party Leader': c.isPartyLeader ? 'Yes' : 'No',
      'Image URL': c.imageUrl
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
    XLSX.writeFile(workbook, "candidates.xlsx");
     toast({ title: "Export Successful", description: "Candidates have been exported to candidates.xlsx" });
  }

  const handleImport = async (data: any[]) => {
    if (!firestore || !parties || !constituencies) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database or party data not ready.' });
      return;
    }

    try {
        const batch = writeBatch(firestore);
        let count = 0;

        for (const row of data) {
            const party = parties.find(p => p.name === row.party || p.acronym === row.party);
            const constituency = constituencies.find(c => c.name === row.constituency);

            if (!party || !constituency) {
                console.warn(`Skipping row due to missing party or constituency:`, row);
                continue;
            }

            const newCandidate = {
                firstName: row.firstName || '',
                lastName: row.lastName || '',
                partyId: party.id,
                constituencyId: constituency.id,
                bio: row.bio || '',
                isIncumbent: row.isIncumbent === 'Yes' || row.isIncumbent === true,
                isPartyLeader: row.isPartyLeader === 'Yes' || row.isPartyLeader === true,
                imageUrl: row.imageUrl || '',
                policyPositions: [],
            };
            
            const candidateRef = doc(collection(firestore, 'candidates'));
            batch.set(candidateRef, newCandidate);
            count++;
        }

        await batch.commit();
        toast({ title: 'Import Successful', description: `${count} candidates imported successfully.` });

    } catch(e) {
        console.error("Error importing candidates:", e);
        toast({ variant: 'destructive', title: 'Import Failed', description: 'An error occurred during import. Check console for details.' });
    } finally {
        setIsImportOpen(false);
    }
  };


  const getPartyName = (partyId: string) => parties?.find(p => p.id === partyId)?.name || 'N/A';
  const getConstituencyName = (constituencyId: string) => constituencies?.find(c => c.id === constituencyId)?.name || 'N/A';
  const isLoading = loadingCandidates || loadingParties || loadingConstituencies;

  const partyDetails = useMemo(() => {
    if (!parties) return { slp: null, uwp: null };
    return {
      slp: parties.find(p => p.acronym === 'SLP'),
      uwp: parties.find(p => p.acronym === 'UWP'),
    };
  }, [parties]);
  
  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    if (!partyFilter) return candidates;
    return candidates.filter(candidate => candidate.partyId === partyFilter);
  }, [candidates, partyFilter]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Candidates"
          description="Add, edit, or remove election candidates."
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import
            </Button>
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
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
      </div>
      
       <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
        parties={parties || []}
        constituencies={constituencies || []}
      />


      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Existing Candidates</CardTitle>
              <CardDescription>A list of all candidates currently in the system.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant={!partyFilter ? "secondary" : "outline"} size="sm" onClick={() => setPartyFilter(null)}>All</Button>
                {partyDetails.slp && <Button variant={partyFilter === partyDetails.slp.id ? "secondary" : "outline"} size="sm" onClick={() => setPartyFilter(partyDetails.slp!.id)}>SLP</Button>}
                {partyDetails.uwp && <Button variant={partyFilter === partyDetails.uwp.id ? "secondary" : "outline"} size="sm" onClick={() => setPartyFilter(partyDetails.uwp!.id)}>UWP</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading candidates...</p>
          ) : errorCandidates ? (
             <div className="text-red-600 bg-red-100 p-4 rounded-md">
                <h3 className="font-bold">Error loading candidates</h3>
                <p>{errorCandidates.message}</p>
                <p className="text-sm mt-2">Please check the Firestore security rules and console for more details.</p>
             </div>
          ) : (
            <div className="space-y-4">
              {filteredCandidates && filteredCandidates.length > 0 ? (
                filteredCandidates.map((candidate) => (
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
                          {candidate.isIncumbent && <span className="font-bold text-primary"> (Inc.)</span>}
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
                <p className="text-center text-muted-foreground py-8">No candidates match the current filter.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
