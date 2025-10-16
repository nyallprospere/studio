
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, orderBy } from 'firebase/firestore';
import type { Election, ElectionResult, Party, Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ResultForm } from './result-form';
import { ImportDialog } from './import-dialog';
import { Pencil, Trash2, Upload, Download, PlusCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminResultsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<ElectionResult | null>(null);

  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const resultsQuery = useMemoFirebase(() => firestore && selectedElectionId ? query(collection(firestore, 'election_results'), where('electionId', '==', selectedElectionId)) : null, [firestore, selectedElectionId]);
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: results, isLoading: loadingResults } = useCollection<ElectionResult>(resultsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesCollection);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);

  const sortedElections = useMemo(() => {
    if (!elections) return [];
    return [...elections].sort((a, b) => {
        if (a.year !== b.year) {
            return b.year - a.year;
        }
        return b.name.localeCompare(a.name);
    });
  }, [elections]);

  const getParty = (partyId: string) => parties?.find(p => p.id === partyId);
  const getConstituency = (constituencyId: string) => constituencies?.find(c => c.id === constituencyId);
  const getElection = (electionId: string) => elections?.find(e => e.id === electionId);

  const handleFormSubmit = async (values: any) => {
    try {
      const resultData = { ...values, votes: Number(values.votes) };

      if (editingResult) {
        const resultDoc = doc(firestore, 'election_results', editingResult.id);
        await updateDoc(resultDoc, resultData);
        toast({ title: "Result Updated", description: `The result has been successfully updated.` });
      } else {
        const resultsCollection = collection(firestore, 'election_results');
        await addDoc(resultsCollection, resultData);
        toast({ title: "Result Added", description: `The result has been successfully added.` });
      }
    } catch (error) {
      console.error("Error saving result: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save result. Check console for details." });
    } finally {
      setIsFormOpen(false);
      setEditingResult(null);
    }
  };

  const handleDelete = async (result: ElectionResult) => {
    try {
      const resultDoc = doc(firestore, 'election_results', result.id);
      await deleteDoc(resultDoc);
      toast({ title: "Result Deleted", description: `The result has been deleted.` });
    } catch (error) {
        console.error("Error deleting result: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete result." });
    }
  };

  const handleExport = () => {
    if (!results || !parties || !constituencies || !elections) {
      toast({ variant: "destructive", title: "Error", description: "Data not loaded yet." });
      return;
    }
    const dataToExport = results.map(r => {
      const election = getElection(r.electionId);
      const party = getParty(r.partyId);
      const constituency = getConstituency(r.constituencyId);
      return {
        'Year': election?.year,
        'Constituency': constituency?.name,
        'Candidate Name': r.candidateName,
        'Party': party?.name,
        'Party Acronym': party?.acronym,
        'Votes': r.votes,
        'Is Winner': r.isWinner ? 'Yes' : 'No',
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Election Results");
    XLSX.writeFile(workbook, "election_results.xlsx");
    toast({ title: "Export Successful", description: "Results have been exported." });
  };

  const handleImport = async (data: any[]) => {
    if (!firestore || !parties || !constituencies || !elections) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database or related data not ready.' });
      return;
    }

    try {
        const batch = writeBatch(firestore);
        let count = 0;

        for (const row of data) {
            const election = elections.find(e => e.year.toString() === row.year.toString());
            const party = parties.find(p => p.name === row.party || p.acronym === row.party);
            const constituency = constituencies.find(c => c.name === row.constituency);

            if (!election || !party || !constituency) {
                console.warn(`Skipping row due to missing election, party, or constituency:`, row);
                continue;
            }

            const newResult: Omit<ElectionResult, 'id'> = {
                electionId: election.id,
                constituencyId: constituency.id,
                candidateName: row.candidateName || '',
                partyId: party.id,
                votes: Number(row.votes) || 0,
                isWinner: ['yes', 'true', true].includes((row.isWinner || 'No').toLowerCase()),
            };
            
            const resultRef = doc(collection(firestore, 'election_results'));
            batch.set(resultRef, newResult);
            count++;
        }

        await batch.commit();
        toast({ title: 'Import Successful', description: `${count} results imported successfully.` });

    } catch(e) {
        console.error("Error importing results:", e);
        toast({ variant: 'destructive', title: 'Import Failed', description: 'An error occurred during import. Check console for details.' });
    } finally {
        setIsImportOpen(false);
    }
  };
  
  const isLoading = loadingElections || loadingParties || loadingConstituencies;
  const isLoadingTable = isLoading || (selectedElectionId && loadingResults);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Election Results"
          description="Add, edit, or remove historical election results."
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={isLoading}>
                <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={isLoading || !results || results.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => { setEditingResult(null); setIsFormOpen(true)}} disabled={isLoading}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Result
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingResult ? 'Edit Result' : 'Add New Result'}</DialogTitle>
                    </DialogHeader>
                    <ResultForm
                        onSubmit={handleFormSubmit}
                        initialData={editingResult}
                        onCancel={() => setIsFormOpen(false)}
                        elections={sortedElections || []}
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
        elections={sortedElections || []}
        constituencies={constituencies || []}
        parties={parties || []}
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Results Browser</CardTitle>
              <CardDescription>Browse results by election year.</CardDescription>
            </div>
            <div className="w-1/4">
                <Select onValueChange={setSelectedElectionId} value={selectedElectionId} disabled={isLoading}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Election Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {sortedElections?.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading elections...</p>
          ) : !selectedElectionId ? (
             <div className="text-center text-muted-foreground py-8">Please select an election year to view results.</div>
          ) : isLoadingTable ? (
            <p>Loading results...</p>
          ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Constituency</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Votes</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results && results.length > 0 ? results.map(result => {
                        const constituency = getConstituency(result.constituencyId);
                        const party = getParty(result.partyId);
                        return (
                            <TableRow key={result.id}>
                                <TableCell>{constituency?.name}</TableCell>
                                <TableCell>{result.candidateName}</TableCell>
                                <TableCell style={{color: party?.color}}>{party?.acronym}</TableCell>
                                <TableCell>{result.votes.toLocaleString()}</TableCell>
                                <TableCell>{result.isWinner ? 'Yes' : 'No'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingResult(result); setIsFormOpen(true);}}>
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
                                                <AlertDialogDescription>This will permanently delete this result. This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(result)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )
                    }) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">No results found for this year.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    