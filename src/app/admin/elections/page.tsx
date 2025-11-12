'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, CollectionReference, writeBatch, getDocs } from 'firebase/firestore';
import type { Election } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ElectionForm } from './election-form';
import { ImportDialog } from './import-dialog';
import { Pencil, Trash2, Upload, Download, Star } from 'lucide-react';
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
import * as XLSX from 'xlsx';
import { MainLayout } from '@/components/layout/main-layout';

export default function AdminElectionsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const { data: elections, isLoading } = useCollection<Election>(electionsQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
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
    const electionData = { ...values, isCurrent: true };

     const electionsCollection = collection(firestore, 'elections');
    
    // Unset current on all other elections
    const batch = writeBatch(firestore);
    const allElections = await getDocs(electionsCollection);
    allElections.forEach(doc => {
        batch.update(doc.ref, { isCurrent: false });
    });
    
    if (editingElection) {
      const electionDoc = doc(firestore, 'elections', editingElection.id);
      batch.update(electionDoc, values);
      
       await batch.commit()
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
        const newDocRef = doc(electionsCollection);
        batch.set(newDocRef, electionData);
        await batch.commit()
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

  const handleSetCurrent = async (electionId: string) => {
    if (!firestore) return;
    
    const batch = writeBatch(firestore);
    const electionsCollection = collection(firestore, 'elections');
    
    const allElections = await getDocs(electionsCollection);
    allElections.forEach(doc => {
        batch.update(doc.ref, { isCurrent: doc.id === electionId });
    });
    
    await batch.commit();
    toast({ title: "Current Election Set", description: "The current election has been updated."});
  }

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

  const handleExport = () => {
    if (!elections) {
      toast({ variant: "destructive", title: "Error", description: "Data not loaded yet." });
      return;
    }
    const dataToExport = sortedElections.map(e => ({
      'Year': e.year,
      'Name': e.name,
      'Description': e.description,
      'Is Current': e.isCurrent ? 'Yes' : 'No',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Elections");
    XLSX.writeFile(workbook, "elections.xlsx");
    toast({ title: "Export Successful", description: "Elections have been exported." });
  }

  const handleImport = async (data: any[]) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database is not ready.' });
      return;
    }

    try {
        const batch = writeBatch(firestore);
        let count = 0;

        // Check for existing elections to prevent duplicates
        const electionsCollection = collection(firestore, 'elections');
        const existingElectionsSnap = await getDocs(electionsCollection);
        const existingElectionYears = new Set(existingElectionsSnap.docs.map(doc => doc.data().year));

        for (const row of data) {
            const year = Number(row.year);
            if (!year || !row.name) {
                console.warn('Skipping row due to missing year or name:', row);
                continue;
            }

            if (existingElectionYears.has(year)) {
                console.warn(`Skipping duplicate year ${year}:`, row);
                continue;
            }

            const newElection = {
                year: year,
                name: row.name,
                description: row.description || '',
                isCurrent: false, // Default to not current on import
            };
            
            const electionRef = doc(electionsCollection);
            batch.set(electionRef, newElection);
            existingElectionYears.add(year); // Add to set to prevent duplicates within the same import
            count++;
        }

        await batch.commit();
        toast({ title: 'Import Successful', description: `${count} elections imported successfully.` });

    } catch(e) {
        console.error("Error importing elections:", e);
        toast({ variant: 'destructive', title: 'Import Failed', description: 'An error occurred during import. Check console for details.' });
    } finally {
        setIsImportOpen(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <MainLayout>
        <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-8">
            <PageHeader
            title="Manage Elections"
            description="Add, edit, or remove election years."
            />
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={!elections || elections.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button>
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
        </div>

        <ImportDialog
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onImport={handleImport}
        />

        <Card>
            <CardHeader>
            <CardTitle>St. Lucian General Elections</CardTitle>
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
                        <div className="flex items-center gap-3">
                        {election.isCurrent && <Star className="h-5 w-5 text-accent fill-accent" />}
                        <div>
                            <p className="font-semibold">{election.name}</p>
                            <p className="text-sm text-muted-foreground">Year: {election.year}</p>
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleSetCurrent(election.id)} disabled={election.isCurrent || election.year < currentYear}>
                            Set as Current
                        </Button>
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
    </MainLayout>
  );
}
