
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, deleteDoc, query, orderBy, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import type { Party, Constituency, ArchivedCandidate, Election, Candidate } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Trash2, History, Lock, Unlock, Pencil, Upload, Eraser, Star, Save, ArrowUpDown, ImageIcon, UserSquare } from 'lucide-react';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectLabel } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CandidateForm } from './candidate-form';
import { uploadFile, deleteFile } from '@/firebase/storage';
import { ImportDialog } from '../admin/candidates/import-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { isEqual } from 'lodash';
import Image from 'next/image';
import { Input } from '@/components/ui/input';

const CustomUploadButton = ({ onFileSelect, candidate, isLoading }: { onFileSelect: (file: File, candidateId: string) => void; candidate: ArchivedCandidate; isLoading: boolean }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
  
    const handleButtonClick = () => {
      fileInputRef.current?.click();
    };
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file, candidate.id);
      }
    };
  
    return (
      <div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept="image/*"
        />
        <Button onClick={handleButtonClick} size="sm" variant="outline" disabled={isLoading}>
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>
    );
};


export default function ArchivePage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [restoreLocks, setRestoreLocks] = useState<Record<string, boolean>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<ArchivedCandidate | null>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);

  const [editableArchives, setEditableArchives] = useState<Record<string, ArchivedCandidate[]>>({});
  const [originalArchives, setOriginalArchives] = useState<Record<string, ArchivedCandidate[]>>({});
  const [sortBy, setSortBy] = useState<'lastName' | 'constituency'>('lastName');
  const [candidatePhotos, setCandidatePhotos] = useState<Record<string, File | null>>({});


  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const { data: allElections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);

  const archivedCandidatesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'archived_candidates') : null, [firestore]);
  const { data: allArchivedCandidates, isLoading: loadingArchived } = useCollection<ArchivedCandidate>(archivedCandidatesCollection);
  
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);

  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesCollection);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);

  const archivedElectionIds = useMemo(() => {
    if (!allArchivedCandidates) return [];
    return [...new Set(allArchivedCandidates.map(c => c.electionId))];
  }, [allArchivedCandidates]);

  const electionsWithArchives = useMemo(() => {
    if (!allElections) return [];
    return allElections.filter(e => archivedElectionIds.includes(e.id)).sort((a, b) => b.year - a.year);
  }, [allElections, archivedElectionIds]);
  
  useEffect(() => {
    if (electionsWithArchives.length > 0 && !selectedElectionId) {
        setSelectedElectionId(electionsWithArchives[0].id);
    }
  }, [electionsWithArchives, selectedElectionId]);

  const displayedArchivedCandidates = useMemo(() => {
    if (!allArchivedCandidates) return [];
    if (selectedElectionId === 'all') return allArchivedCandidates;
    return allArchivedCandidates.filter(c => c.electionId === selectedElectionId);
  }, [selectedElectionId, allArchivedCandidates]);


  const getPartyAcronym = (partyId: string) => parties?.find(p => p.id === partyId)?.acronym || 'N/A';
  const getParty = (partyId: string) => parties?.find(p => p.id === partyId);
  const getConstituencyName = (constituencyId: string) => constituencies?.find(c => c.id === constituencyId)?.name || 'N/A';
  const isLoading = loadingArchived || loadingParties || loadingConstituencies || loadingElections;
  
  const groupedArchives = useMemo(() => {
    if (!displayedArchivedCandidates) return {};
    return displayedArchivedCandidates.reduce((acc, candidate) => {
      const { electionId } = candidate;
      if (!acc[electionId]) {
        const election = allElections?.find(e => e.id === electionId);
        acc[electionId] = {
          electionName: election?.name || 'Unknown Election',
          date: candidate.archiveDate,
          candidates: []
        };
      }
      acc[electionId].candidates.push(candidate);
      return acc;
    }, {} as Record<string, { electionName: string; date: string; candidates: ArchivedCandidate[] }>);
  }, [displayedArchivedCandidates, allElections]);

  useEffect(() => {
    const archives: Record<string, ArchivedCandidate[]> = {};
     for (const electionId in groupedArchives) {
        archives[electionId] = JSON.parse(JSON.stringify(groupedArchives[electionId].candidates));
    }
    setEditableArchives(archives);
    setOriginalArchives(archives);
  }, [groupedArchives]);

  const handleIncumbentChange = (electionId: string, candidateId: string, isIncumbent: boolean) => {
    setEditableArchives(prev => ({
        ...prev,
        [electionId]: prev[electionId].map(c => 
            c.id === candidateId ? { ...c, isIncumbent } : c
        )
    }));
  };

  const handleSaveChanges = async (electionId: string) => {
    if (!firestore) return;
    const original = originalArchives[electionId];
    const editable = editableArchives[electionId];
    if (!original || !editable) return;
    
    const changes = editable.filter((c, index) => !isEqual(c, original[index]));
    
    if (changes.length === 0) {
        toast({ title: 'No changes to save.' });
        return;
    }

    try {
        const batch = writeBatch(firestore);
        changes.forEach(candidate => {
            const docRef = doc(firestore, 'archived_candidates', candidate.id);
            batch.update(docRef, { isIncumbent: candidate.isIncumbent });
        });
        await batch.commit();
        toast({ title: 'Success', description: `${changes.length} candidate(s) updated.` });
    } catch(e) {
        console.error("Error saving changes: ", e);
        toast({ variant: "destructive", title: "Error", description: "Failed to save changes." });
    }
  }


  const handleFormSubmit = async (values: any) => {
    if (!firestore || !editingCandidate) return;

    try {
      let imageUrl = values.imageUrl;
      if (values.photoFile) {
        if (editingCandidate.imageUrl) {
          await deleteFile(editingCandidate.imageUrl);
        }
        imageUrl = await uploadFile(values.photoFile, `candidates/${values.photoFile.name}`);
      }

      const updatedCandidateData = {
        ...editingCandidate,
        ...values,
        imageUrl,
      };
      delete updatedCandidateData.photoFile;
      
      const archivedDocRef = doc(firestore, 'archived_candidates', editingCandidate.id);
      await updateDoc(archivedDocRef, updatedCandidateData as any);

      toast({ title: 'Candidate Updated', description: `${updatedCandidateData.firstName} ${updatedCandidateData.lastName}'s archived record has been updated.` });
    
    } catch (error) {
       console.error("Error updating archived candidate: ", error);
       toast({ variant: "destructive", title: "Error", description: "Failed to update archived candidate." });
    } finally {
        setIsFormOpen(false);
        setEditingCandidate(null);
    }
  };

  const handleExport = (electionId: string) => {
    const archive = groupedArchives[electionId];
    if (!archive || !parties || !constituencies) {
        toast({ variant: "destructive", title: "Error", description: "Data not loaded yet." });
        return;
    }

    const dataToExport = archive.candidates.map(c => ({
        'First Name': c.firstName,
        'Last Name': c.lastName,
        'Party': getPartyAcronym(c.partyId),
        'Constituency': getConstituencyName(c.constituencyId),
        'Bio': c.bio,
        'Is Incumbent': c.isIncumbent ? 'Yes' : 'No',
        'Is Party Leader': c.isPartyLeader ? 'Yes' : 'No',
        'Party Level': c.partyLevel,
        'Image URL': c.imageUrl
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ArchivedCandidates");
    XLSX.writeFile(workbook, `archive-${archive.electionName.replace(/\s/g, '_')}.xlsx`);
    toast({ title: "Export Successful", description: "Archived candidates have been exported." });
  };
  
  const handleRestoreAll = async (electionId: string) => {
    if (!firestore) return;

    const archive = groupedArchives[electionId];
    if (!archive) return;

    const candidatesCollectionRef = collection(firestore, 'candidates');
    const archiveCollectionRef = collection(firestore, 'archived_candidates');
    
    try {
        const restoreBatch = writeBatch(firestore);
        const deleteBatch = writeBatch(firestore);

        for (const candidate of archive.candidates) {
            const { id, originalId, archiveDate, electionId: aId, ...candidateData} = candidate;
            
            const newCandidateRef = doc(candidatesCollectionRef, originalId);
            restoreBatch.set(newCandidateRef, { ...candidateData, name: `${candidateData.firstName} ${candidateData.lastName}`});

            const archivedDocRef = doc(archiveCollectionRef, id);
            deleteBatch.delete(archivedDocRef);
        }

        await restoreBatch.commit();
        await deleteBatch.commit();

        toast({ title: 'Restore Successful', description: `Restored ${archive.candidates.length} candidates for ${archive.electionName}.` });
    } catch (e) {
        console.error("Error restoring archive:", e);
        toast({ variant: 'destructive', title: 'Restore Failed', description: 'Could not restore candidates. Check console for details.' });
    }
  };

  const handleClearCandidateInfo = async (electionId: string) => {
    if (!firestore) return;
    const archive = groupedArchives[electionId];
    if (!archive) return;

    try {
      const batch = writeBatch(firestore);
      for (const candidate of archive.candidates) {
        if (candidate.imageUrl) await deleteFile(candidate.imageUrl);
        const docRef = doc(firestore, 'archived_candidates', candidate.id);
        batch.update(docRef, {
          firstName: '',
          lastName: '',
          bio: '',
          imageUrl: '',
          policyPositions: [],
          isIncumbent: false,
          isPartyLeader: false,
          isDeputyLeader: false,
          partyLevel: 'lower',
        });
      }
      await batch.commit();
      toast({ title: 'Candidate Info Cleared', description: `Cleared info for ${archive.candidates.length} candidates in ${archive.electionName}.` });
    } catch (e) {
      console.error("Error clearing candidate info:", e);
      toast({ variant: 'destructive', title: 'Clear Failed', description: 'Could not clear candidate info. Check console for details.' });
    }
  }

  const handleDeleteArchive = async (electionId: string) => {
    if (!firestore) return;
    const archive = groupedArchives[electionId];
    if (!archive) return;

    try {
        const batch = writeBatch(firestore);
        for(const candidate of archive.candidates) {
            if (candidate.imageUrl) await deleteFile(candidate.imageUrl);
            const docRef = doc(firestore, 'archived_candidates', candidate.id);
            batch.delete(docRef);
        }
        await batch.commit();
        toast({ title: 'Archive Deleted', description: `Archive for ${archive.electionName} has been deleted.` });
    } catch (e) {
        console.error("Error deleting archive:", e);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete archive. Check console for details.' });
    }
  }

  const handleImport = async (data: any[], electionId?: string) => {
    if (!firestore || !parties || !constituencies || !electionId) {
        toast({ variant: 'destructive', title: 'Error', description: 'An election must be selected to import candidates.' });
        return;
    }
    
    const archiveDate = new Date().toISOString();

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

            const newArchivedCandidate: Omit<ArchivedCandidate, 'id'> = {
                originalId: doc(collection(firestore, 'candidates')).id, // Generate a placeholder original ID
                electionId: electionId,
                archiveDate,
                firstName: row.firstName || '',
                lastName: row.lastName || '',
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
            
            const candidateRef = doc(collection(firestore, 'archived_candidates'));
            batch.set(candidateRef, newArchivedCandidate);
            count++;
        }

        await batch.commit();
        toast({ title: 'Import Successful', description: `${count} archived candidates imported.` });

    } catch(e) {
        console.error("Error importing archived candidates:", e);
        toast({ variant: 'destructive', title: 'Import Failed', description: 'An error occurred during import. Check console for details.' });
    } finally {
        setIsImportOpen(false);
    }
  };

  const handlePhotoUpload = async (file: File, candidateId: string) => {
    if (!firestore) return;
    const candidate = allArchivedCandidates?.find(c => c.id === candidateId);
    if (!candidate) {
        toast({ variant: 'destructive', title: 'Candidate not found' });
        return;
    }
    setUploadingPhotoId(candidateId);
    try {
      if (candidate.imageUrl) {
        await deleteFile(candidate.imageUrl);
      }
      const newImageUrl = await uploadFile(file, `candidates/${candidate.originalId || candidate.id}.jpg`);
      
      const candidateDoc = doc(firestore, 'archived_candidates', candidate.id);
      await updateDoc(candidateDoc, { imageUrl: newImageUrl });

      toast({ title: 'Photo Uploaded', description: `Photo for ${candidate.firstName} ${candidate.lastName} has been updated.` });

    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload photo.' });
    } finally {
        setUploadingPhotoId(null);
    }
  };


  return (
    <div className="container mx-auto px-4 py-8">
       <div className="flex justify-between items-start mb-8">
         <PageHeader
            title="Archived Candidates"
            description="Browse and manage past sets of candidates."
         />
         <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={isLoading}>
                <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Select onValueChange={setSelectedElectionId} value={selectedElectionId}>
                <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by election..." />
                </SelectTrigger>
                <SelectContent>
                    {electionsWithArchives?.map(election => (
                        <SelectItem key={election.id} value={election.id}>{election.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
         </div>
      </div>
      
       <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
        parties={parties || []}
        constituencies={constituencies || []}
        elections={allElections || []}
        isArchiveImport={true}
      />
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-3xl h-[90vh]">
                <DialogHeader>
                <DialogTitle>Edit Archived Candidate</DialogTitle>
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

      {isLoading ? <p>Loading archives...</p> : (
        <div className="space-y-8">
            {Object.keys(groupedArchives).length > 0 ? (
                Object.entries(groupedArchives).map(([electionId, archiveData]) => {
                  const hasChanges = !isEqual(originalArchives[electionId], editableArchives[electionId]);
                  
                  const sortedCandidates = [...(editableArchives[electionId] || [])].sort((a, b) => {
                    if (sortBy === 'constituency') {
                        const nameA = getConstituencyName(a.constituencyId);
                        const nameB = getConstituencyName(b.constituencyId);
                        return nameA.localeCompare(nameB);
                    }
                    return a.lastName.localeCompare(b.lastName);
                  });

                  return (
                    <Card key={electionId}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{archiveData.electionName}</CardTitle>
                                    <CardDescription>
                                        {archiveData.candidates.length} candidates archived on <span className="text-xs">{new Date(archiveData.date).toLocaleString()}</span>
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                     {hasChanges && <Button size="sm" onClick={() => handleSaveChanges(electionId)}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>}
                                     <Button variant="outline" size="sm" onClick={() => handleExport(electionId)}>
                                        <Download className="mr-2 h-4 w-4" /> Export
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" disabled={restoreLocks[electionId] !== false}>
                                                <Eraser className="mr-2 h-4 w-4" /> Clear All Candidate Info
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will clear all personal information for {archiveData.candidates.length} candidates in this archive, leaving only their party and constituency. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleClearCandidateInfo(electionId)}>Yes, Clear Info</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <div className="flex items-center gap-1">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" disabled={restoreLocks[electionId] !== false}>
                                                    <History className="mr-2 h-4 w-4" /> Restore All
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                    This will restore all {archiveData.candidates.length} candidates from this archive to the main list and remove them from the archive.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRestoreAll(electionId)}>Yes, Restore All</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={() => setRestoreLocks(prev => ({...prev, [electionId]: !prev[electionId]}))}
                                        >
                                            {restoreLocks[electionId] !== false ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" disabled={restoreLocks[electionId] !== false}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Archive
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete this entire archive of {archiveData.candidates.length} candidates. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteArchive(electionId)}>Yes, Delete Archive</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-2 pr-4">
                                <div className="flex items-center justify-between p-3 border-b text-sm font-medium text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <p>Candidate</p>
                                        <Select value={sortBy} onValueChange={(value: 'lastName' | 'constituency') => setSortBy(value)}>
                                            <SelectTrigger className="w-auto h-7 text-xs">
                                                <SelectValue placeholder="Sort by..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lastName">Name</SelectItem>
                                                <SelectItem value="constituency">Constituency</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="w-24 text-center">Photo</p>
                                        <p className="w-12 text-center">Inc.</p>
                                        <p>Actions</p>
                                    </div>
                                </div>
                                {sortedCandidates.map(c => {
                                    const party = getParty(c.partyId);
                                    return (
                                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                                                    {c.imageUrl ? (
                                                        <Image src={c.imageUrl} alt={`${c.firstName} ${c.lastName}`} fill className="object-cover" />
                                                    ) : party?.logoUrl ? (
                                                        <Image src={party.logoUrl} alt={`${party.name} logo`} fill className="object-contain p-1" />
                                                    ) : (
                                                        <UserSquare className="h-6 w-6 text-muted-foreground m-auto" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium flex items-center gap-2">
                                                        {c.firstName} {c.lastName}
                                                        {c.isPartyLeader && <Star className="h-4 w-4 text-accent" />}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">{getPartyAcronym(c.partyId)} &bull; {getConstituencyName(c.constituencyId)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-40">
                                                    <CustomUploadButton onFileSelect={handlePhotoUpload} candidate={c} isLoading={uploadingPhotoId === c.id} />
                                                </div>
                                                <Checkbox
                                                    checked={c.isIncumbent}
                                                    onCheckedChange={(checked) => handleIncumbentChange(electionId, c.id, !!checked)}
                                                    className="w-12"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingCandidate(c); setIsFormOpen(true);}}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )})
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <p>No archived candidates found for the selected election.</p>
                </div>
            )}
        </div>
      )}
    </div>
  )
}
