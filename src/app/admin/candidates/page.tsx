
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, query, orderBy, where } from 'firebase/firestore';
import type { Candidate, Party, Constituency, ArchivedCandidate, Election } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CandidateForm } from './candidate-form';
import { ImportDialog } from './import-dialog';
import Image from 'next/image';
import { UserSquare, Pencil, Trash2, Upload, Download, Archive, XCircle, Lock, Unlock } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';


export default function AdminCandidatesPage() {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();

  const candidatesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), where('isCurrent', '==', true)) : null, [firestore]);
  
  const { data: candidates, isLoading: loadingCandidates, error: errorCandidates } = useCollection<Candidate>(candidatesCollection);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesCollection);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);
  const { data: currentElections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);

  const currentElection = useMemo(() => currentElections?.[0], [currentElections]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [isClearAllLocked, setIsClearAllLocked] = useState(true);

  const handleFormSubmit = async (values: any) => {
    if (!firestore || !candidatesCollection) return;
    
    const candidateName = `${values.firstName} ${values.lastName}`;
    let imageUrl = values.imageUrl;

    try {
      // Handle file upload if a new file is provided
      if (values.photoFile) {
        // If editing and there's an old image, delete it
        if (editingCandidate?.imageUrl) {
          await deleteFile(editingCandidate.imageUrl).catch(console.warn);
        }
        const uniqueFileName = `${candidateName.replace(/ /g, '_')}_${Date.now()}`;
        imageUrl = await uploadFile(values.photoFile, `candidates/${uniqueFileName}`);
      } else if (values.removePhoto && editingCandidate?.imageUrl) {
        // Handle photo removal
        await deleteFile(editingCandidate.imageUrl).catch(console.warn);
        imageUrl = '';
      }
      
      let customLogoUrl = values.customLogoUrl;
      if (values.customLogoFile) {
        if (editingCandidate?.customLogoUrl) {
          await deleteFile(editingCandidate.customLogoUrl).catch(console.warn);
        }
        customLogoUrl = await uploadFile(values.customLogoFile, `logos/ind_${values.lastName}_${Date.now()}.png`);
      }

      const candidateData: Omit<Candidate, 'id'> = {
        name: candidateName,
        firstName: values.firstName,
        lastName: values.lastName,
        partyId: values.partyId,
        constituencyId: values.constituencyId,
        bio: values.bio || '',
        imageUrl: imageUrl || '',
        facebookUrl: values.facebookUrl || '',
        customLogoUrl: customLogoUrl || '',
        isIncumbent: values.isIncumbent,
        isPartyLeader: values.isPartyLeader,
        isDeputyLeader: values.isDeputyLeader,
        partyLevel: values.partyLevel,
        isIndependentCastriesNorth: values.isIndependentCastriesNorth,
        isIndependentCastriesCentral: values.isIndependentCastriesCentral,
        policyPositions: [], // Ensure this is initialized
      };
      
      if (editingCandidate) {
        const candidateDoc = doc(firestore, 'candidates', editingCandidate.id);
        await updateDoc(candidateDoc, candidateData);
        toast({ title: "Candidate Updated", description: `${candidateName} has been successfully updated.` });
      } else {
        await addDoc(candidatesCollection, candidateData);
        toast({ title: "Candidate Added", description: `${candidateName} has been successfully added.` });
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
      'Party': getPartyAcronym(c.partyId),
      'Constituency': getConstituencyName(c.constituencyId),
      'Bio': c.bio,
      'Is Incumbent': c.isIncumbent ? 'Yes' : 'No',
      'Is Party Leader': c.isPartyLeader ? 'Yes' : 'No',
      'Is Deputy Leader': c.isDeputyLeader ? 'Yes' : 'No',
      'Party Level': c.partyLevel,
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

            const newCandidate: Omit<Candidate, 'id'> = {
                firstName: row.firstName || '',
                lastName: row.lastName || '',
                name: `${row.firstName || ''} ${row.lastName || ''}`,
                partyId: party.id,
                constituencyId: constituency.id,
                bio: row.bio || '',
                isIncumbent: row.isIncumbent === 'Yes' || row.isIncumbent === true,
                isPartyLeader: row.isPartyLeader === 'Yes' || row.isPartyLeader === true,
                isDeputyLeader: row.isDeputyLeader === 'Yes' || row.isDeputyLeader === true,
                partyLevel: row.partyLevel === 'higher' ? 'higher' : 'lower',
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

  const handleArchiveAll = async () => {
    if (!firestore || !candidates || !currentElection) {
        toast({ variant: 'destructive', title: 'Error', description: 'Candidates data not loaded or no current election set.' });
        return;
    }

    const archiveCollectionRef = collection(firestore, 'archived_candidates');
    const archiveDate = new Date().toISOString();
    
    try {
        const archiveBatch = writeBatch(firestore);

        for (const candidate of candidates) {
            const { id, ...candidateData } = candidate;
            const newArchivedDoc = doc(archiveCollectionRef);
            archiveBatch.set(newArchivedDoc, { 
                ...candidateData, 
                archiveDate,
                electionId: currentElection.id,
                originalId: id
             });
        }

        await archiveBatch.commit();
        toast({ title: 'Archive Successful', description: `${candidates.length} candidates have been archived for the ${currentElection.name}.` });
    } catch (error) {
        console.error("Error archiving candidates: ", error);
        toast({ variant: 'destructive', title: 'Archive Failed', description: 'Could not archive candidates. Check console for details.' });
    }
  };

  const handleClearAll = async () => {
    if (!firestore || !candidates || !candidatesCollection) {
        toast({ variant: 'destructive', title: 'Error', description: 'Candidates data not loaded or firestore unavailable.' });
        return;
    }
     try {
        const deleteBatch = writeBatch(firestore);
        for (const candidate of candidates) {
            if (candidate.imageUrl) await deleteFile(candidate.imageUrl);
            const originalDocRef = doc(candidatesCollection, candidate.id);
            deleteBatch.delete(originalDocRef);
        }
        await deleteBatch.commit();
        toast({ title: 'Clear Successful', description: `All ${candidates.length} candidates have been cleared.` });
    } catch (error) {
        console.error("Error clearing candidates: ", error);
        toast({ variant: 'destructive', title: 'Clear Failed', description: 'Could not clear all candidates. Check console for details.' });
    }
  }


  const getPartyAcronym = (partyId: string) => parties?.find(p => p.id === partyId)?.acronym || 'N/A';
  const getConstituencyName = (constituencyId: string) => constituencies?.find(c => c.id === constituencyId)?.name || 'N/A';
  const isLoading = loadingCandidates || loadingParties || loadingConstituencies || loadingElections;

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
  
  const cardTitle = currentElection ? `${currentElection.name} Candidates` : 'Existing Candidates';
  const cardDescription = currentElection ? `A list of all candidates for the ${currentElection.year} election.` : 'A list of all candidates currently in the system.';


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
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={!candidates || candidates.length === 0 || !currentElection}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will move all {candidates?.length || 0} current candidates to an archive under the election: <strong>{currentElection?.name}</strong>. You can clear them in a separate step.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchiveAll}>Yes, Archive All</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="flex items-center gap-1">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!candidates || candidates.length === 0 || isClearAllLocked}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Clear All
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all {candidates?.length || 0} candidates. This action cannot be undone. Consider archiving first.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAll}>Yes, Clear All</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setIsClearAllLocked(!isClearAllLocked)}
                    disabled={!candidates || candidates.length === 0}
                    >
                    {isClearAllLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => { setEditingCandidate(null); setIsFormOpen(true)}}>Add New Candidate</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl h-[90vh]">
                <DialogHeader>
                <DialogTitle>{editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-full">
                <div className="pr-6">
                    <CandidateForm
                    onSubmit={handleFormSubmit}
                    initialData={editingCandidate}
                    onCancel={() => setIsFormOpen(false)}
                    parties={parties || []}
                    constituencies={constituencies || []}
                    />
                </div>
                </ScrollArea>
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
            <CardTitle>{cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
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
            <ScrollArea className="h-[640px] pr-4">
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
                            <p className="font-semibold">{candidate.firstName} {candidate.lastName} {candidate.isIncumbent && <span className="font-normal text-primary text-sm">(Inc.)</span>}</p>
                            <p className="text-sm text-muted-foreground">
                            {getPartyAcronym(candidate.partyId)} 
                            {(candidate.isIndependentCastriesCentral || candidate.isIndependentCastriesNorth) && ' (IND)'}
                            &bull; {getConstituencyName(candidate.constituencyId)}
                            {candidate.isPartyLeader && <span className="font-bold text-primary"> (Party Leader)</span>}
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
            </ScrollArea>
        )}
        </CardContent>
    </Card>
    <div className="mt-8">
        <Button asChild variant="outline">
            <Link href="/archive">Browse & Restore Archives</Link>
        </Button>
    </div>
    </div>
  );
}
