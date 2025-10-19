
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { Party, Constituency, ArchivedCandidate } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Trash2, History } from 'lucide-react';
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

export default function ArchivePage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const archivedCandidatesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'archived_candidates'), orderBy('archiveDate', 'desc')) : null, [firestore]);
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);

  const { data: archivedCandidates, isLoading: loadingArchived } = useCollection<ArchivedCandidate>(archivedCandidatesQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesCollection);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);

  const getPartyAcronym = (partyId: string) => parties?.find(p => p.id === partyId)?.acronym || 'N/A';
  const getConstituencyName = (constituencyId: string) => constituencies?.find(c => c.id === constituencyId)?.name || 'N/A';
  const isLoading = loadingArchived || loadingParties || loadingConstituencies;
  
  const groupedArchives = useMemo(() => {
    if (!archivedCandidates) return {};
    return archivedCandidates.reduce((acc, candidate) => {
      const { archiveId } = candidate;
      if (!acc[archiveId]) {
        acc[archiveId] = {
          date: candidate.archiveDate,
          candidates: []
        };
      }
      acc[archiveId].candidates.push(candidate);
      return acc;
    }, {} as Record<string, { date: string; candidates: ArchivedCandidate[] }>);
  }, [archivedCandidates]);

  const handleExport = (archiveId: string) => {
    const archive = groupedArchives[archiveId];
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
        'Is Deputy Leader': c.isDeputyLeader ? 'Yes' : 'No',
        'Party Level': c.partyLevel,
        'Image URL': c.imageUrl
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ArchivedCandidates");
    XLSX.writeFile(workbook, `archive-${archiveId}.xlsx`);
    toast({ title: "Export Successful", description: "Archived candidates have been exported." });
  };
  
  const handleRestore = async (archiveId: string) => {
    if (!firestore) return;

    const archive = groupedArchives[archiveId];
    if (!archive) return;

    const candidatesCollectionRef = collection(firestore, 'candidates');
    const archiveCollectionRef = collection(firestore, 'archived_candidates');
    
    try {
        const restoreBatch = writeBatch(firestore);
        const deleteBatch = writeBatch(firestore);

        for (const candidate of archive.candidates) {
            const { id, originalId, archiveDate, archiveId: aId, ...candidateData} = candidate;
            
            // Restore to main candidates collection
            const newCandidateRef = doc(candidatesCollectionRef, originalId);
            restoreBatch.set(newCandidateRef, candidateData);

            // Delete from archive
            const archivedDocRef = doc(archiveCollectionRef, id);
            deleteBatch.delete(archivedDocRef);
        }

        await restoreBatch.commit();
        await deleteBatch.commit();

        toast({ title: 'Restore Successful', description: `Restored ${archive.candidates.length} candidates.` });
    } catch (e) {
        console.error("Error restoring archive:", e);
        toast({ variant: 'destructive', title: 'Restore Failed', description: 'Could not restore candidates. Check console for details.' });
    }
  };

  const handleDeleteArchive = async (archiveId: string) => {
    if (!firestore) return;
    const archive = groupedArchives[archiveId];
    if (!archive) return;

    try {
        const batch = writeBatch(firestore);
        for(const candidate of archive.candidates) {
            const docRef = doc(firestore, 'archived_candidates', candidate.id);
            batch.delete(docRef);
        }
        await batch.commit();
        toast({ title: 'Archive Deleted', description: `Archive from ${new Date(archive.date).toLocaleString()} has been deleted.` });
    } catch (e) {
        console.error("Error deleting archive:", e);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete archive. Check console for details.' });
    }
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Archived Candidates"
        description="Browse and manage past sets of candidates."
      />
      
      {isLoading ? <p>Loading archives...</p> : (
        <div className="space-y-8">
            {Object.keys(groupedArchives).length > 0 ? (
                Object.entries(groupedArchives).map(([archiveId, archiveData]) => (
                    <Card key={archiveId}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Archived on {new Date(archiveData.date).toLocaleString()}</CardTitle>
                                    <CardDescription>{archiveData.candidates.length} candidates</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                     <Button variant="outline" size="sm" onClick={() => handleExport(archiveId)}>
                                        <Download className="mr-2 h-4 w-4" /> Export
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <History className="mr-2 h-4 w-4" /> Restore
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                   This will restore all {archiveData.candidates.length} candidates from this archive to the main list and remove them from the archive. This is useful for correcting mistakes.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRestore(archiveId)}>Yes, Restore</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                                                <AlertDialogAction onClick={() => handleDeleteArchive(archiveId)}>Yes, Delete Archive</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-2 pr-4">
                                {archiveData.candidates.map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
                                        <p className="font-medium">{c.firstName} {c.lastName}</p>
                                        <p className="text-muted-foreground">{getPartyAcronym(c.partyId)} &bull; {getConstituencyName(c.constituencyId)}</p>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <p>No archived candidates found.</p>
                </div>
            )}
        </div>
      )}
    </div>
  )
}
