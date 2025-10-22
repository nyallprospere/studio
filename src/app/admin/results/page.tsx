
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, orderBy, getDocs } from 'firebase/firestore';
import type { Election, ElectionResult, Party, Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ResultForm } from './result-form';
import { ImportDialog } from './import-dialog';
import { LeaderForm } from './leader-form';
import { Pencil, Trash2, Upload, Download, PlusCircle, UserX, User } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadFile, deleteFile } from '@/firebase/storage';

export default function AdminResultsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLeaderFormOpen, setIsLeaderFormOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<ElectionResult | null>(null);

  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const resultsQuery = useMemoFirebase(() => firestore && selectedElectionId ? query(collection(firestore, 'election_results'), where('electionId', '==', selectedElectionId)) : null, [firestore, selectedElectionId]);
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: results, isLoading: loadingResults } = useCollection<ElectionResult>(resultsQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesCollection);

  const uwpParty = useMemo(() => parties?.find(p => p.acronym === 'UWP'), [parties]);
  const slpParty = useMemo(() => parties?.find(p => p.acronym === 'SLP'), [parties]);

  const sortedElections = useMemo(() => {
    if (!elections) return [];
    return [...elections].sort((a, b) => {
        if (a.year !== b.year) {
            return b.year - a.year;
        }
        return b.name.localeCompare(a.name);
    });
  }, [elections]);

  const getConstituency = (constituencyId: string) => constituencies?.find(c => c.id === constituencyId);
  const getElection = (electionId: string) => elections?.find(e => e.id === electionId);

  const handleFormSubmit = async (values: any) => {
    try {
      const totalVotes = values.slpVotes + values.uwpVotes + values.otherVotes;
      
      let registeredVoters = values.registeredVoters;
      let turnout = 0;

      if (values.votersNotAvailable) {
        registeredVoters = 0;
        turnout = 0;
      } else if (registeredVoters > 0) {
        turnout = (totalVotes / registeredVoters) * 100;
      }
      
      const resultData = { 
        electionId: values.electionId,
        constituencyId: values.constituencyId,
        slpVotes: values.slpVotes,
        uwpVotes: values.uwpVotes,
        otherVotes: values.otherVotes,
        registeredVoters,
        totalVotes,
        turnout: parseFloat(turnout.toFixed(2))
      };

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

  const handleLeaderFormSubmit = async (values: any) => {
    if (!firestore || !selectedElectionId) return;
    
    try {
      const election = getElection(selectedElectionId);
      if (!election) return;

      let uwpLeaderImageUrl = values.uwpLeaderImageUrl;
      if (values.uwpLeaderPhotoFile) {
        if(election.uwpLeaderImageUrl) await deleteFile(election.uwpLeaderImageUrl);
        uwpLeaderImageUrl = await uploadFile(values.uwpLeaderPhotoFile, `leaders/${election.year}_uwp.jpg`);
      }

      let slpLeaderImageUrl = values.slpLeaderImageUrl;
      if (values.slpLeaderPhotoFile) {
        if(election.slpLeaderImageUrl) await deleteFile(election.slpLeaderImageUrl);
        slpLeaderImageUrl = await uploadFile(values.slpLeaderPhotoFile, `leaders/${election.year}_slp.jpg`);
      }
      
      const leaderData = {
        uwpLeader: values.uwpLeader,
        uwpLeaderImageUrl,
        slpLeader: values.slpLeader,
        slpLeaderImageUrl,
      };

      const electionDoc = doc(firestore, 'elections', selectedElectionId);
      await updateDoc(electionDoc, leaderData);
      toast({ title: "Leaders Updated", description: `Party leaders for ${election.name} have been updated.` });

    } catch (error) {
      console.error("Error saving leaders: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save leaders. Check console for details." });
    } finally {
      setIsLeaderFormOpen(false);
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

  const handleDeleteAllForYear = async () => {
    if (!firestore || !results || results.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'No results to delete for the selected year.' });
        return;
    }
    const election = getElection(selectedElectionId);
    if (!election) return;
    
    try {
        const batch = writeBatch(firestore);
        results.forEach(result => {
            const docRef = doc(firestore, 'election_results', result.id);
            batch.delete(docRef);
        });
        await batch.commit();
        toast({ title: 'All Results Deleted', description: `All results for ${election.name} have been deleted.`});
    } catch (error) {
        console.error('Error deleting all results:', error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete all results. Check console for details.' });
    }
  }

  const handleSetAllVotersNA = async () => {
    if (!firestore || !results || results.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'No results to update for the selected year.' });
        return;
    }
    const election = getElection(selectedElectionId);
    if (!election) return;

    try {
        const batch = writeBatch(firestore);
        results.forEach(result => {
            const docRef = doc(firestore, 'election_results', result.id);
            batch.update(docRef, { registeredVoters: 0, turnout: 0 });
        });
        await batch.commit();
        toast({ title: 'Bulk Update Successful', description: `All results for ${election.name} have been set to N/A for voters.`});
    } catch (error) {
        console.error('Error updating all results:', error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update all results. Check console for details.' });
    }
  }

  const handleExport = () => {
    if (!results || !constituencies || !elections) {
      toast({ variant: "destructive", title: "Error", description: "Data not loaded yet." });
      return;
    }
    const dataToExport = results.map(r => {
      const election = getElection(r.electionId);
      const constituency = getConstituency(r.constituencyId);
      return {
        'Year': election?.year,
        'Election Name': election?.name,
        'Constituency': constituency?.name,
        'Registered Voters': r.registeredVoters === 0 ? 'N/A' : (r.registeredVoters || constituency?.demographics.registeredVoters || 0),
        'SLP Votes': r.slpVotes,
        'UWP Votes': r.uwpVotes,
        'Other Votes': r.otherVotes,
        'Total Votes': r.totalVotes,
        'Turnout %': r.turnout === 0 ? 'N/A' : r.turnout,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Election Results");
    XLSX.writeFile(workbook, "election_results.xlsx");
    toast({ title: "Export Successful", description: "Results have been exported." });
  };

  const handleImport = async (data: any[]) => {
    if (!firestore || !constituencies || !elections) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database or related data not ready.' });
      return;
    }

    try {
        const batch = writeBatch(firestore);
        let count = 0;

        for (const row of data) {
            const election = elections.find(e => e.year.toString() === row.year.toString());
            const constituency = constituencies.find(c => c.name === row.constituency);

            if (!election || !constituency) {
                console.warn(`Skipping row due to missing election or constituency:`, row);
                continue;
            }
            
            const slpVotes = Number(row.slpVotes) || 0;
            const uwpVotes = Number(row.uwpVotes) || 0;
            const otherVotes = Number(row.otherVotes) || 0;
            const totalVotes = slpVotes + uwpVotes + otherVotes;
            const registeredVoters = row.registeredVoters === 'N/A' ? 0 : Number(row.registeredVoters) || constituency.demographics.registeredVoters || 0;
            const turnout = registeredVoters > 0 
                ? (totalVotes / registeredVoters) * 100 
                : 0;

            const newResult: Omit<ElectionResult, 'id'> = {
                electionId: election.id,
                constituencyId: constituency.id,
                slpVotes,
                uwpVotes,
                otherVotes,
                totalVotes,
                registeredVoters,
                turnout: parseFloat(turnout.toFixed(2)),
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
  
  const isLoading = loadingElections || loadingConstituencies || loadingParties;
  const isLoadingTable = isLoading || (selectedElectionId && loadingResults);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Election Results"
          description="Add, edit, or remove historical election results by constituency."
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
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingResult ? 'Edit Result' : 'Add New Result'}</DialogTitle>
                    </DialogHeader>
                    <ResultForm
                        onSubmit={handleFormSubmit}
                        initialData={editingResult}
                        onCancel={() => setIsFormOpen(false)}
                        elections={sortedElections || []}
                        constituencies={constituencies || []}
                    />
                </DialogContent>
            </Dialog>
             <Dialog open={isLeaderFormOpen} onOpenChange={setIsLeaderFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setIsLeaderFormOpen(true)} disabled={isLoading || !selectedElectionId}>
                        <User className="mr-2 h-4 w-4" /> Set Leaders
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Set Party Leaders for {getElection(selectedElectionId)?.name}</DialogTitle>
                    </DialogHeader>
                    <LeaderForm
                        onSubmit={handleLeaderFormSubmit}
                        initialData={getElection(selectedElectionId)}
                        onCancel={() => setIsLeaderFormOpen(false)}
                        uwpParty={uwpParty}
                        slpParty={slpParty}
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
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Results Browser</CardTitle>
              <CardDescription>Browse results by election year.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="outline" size="sm" disabled={!selectedElectionId || !results || results.length === 0}>
                            <UserX className="mr-2 h-4 w-4" />
                            Voters N/A
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will set the Registered Voters and Turnout to N/A for all {results?.length} results for the <strong>{getElection(selectedElectionId)?.name}</strong> election. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSetAllVotersNA}>Set to N/A</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" size="sm" disabled={!selectedElectionId || !results || results.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all {results?.length} results for the <strong>{getElection(selectedElectionId)?.name}</strong> election. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAllForYear}>Delete All Results</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Select onValueChange={setSelectedElectionId} value={selectedElectionId} disabled={isLoading}>
                    <SelectTrigger className="w-56">
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
                        <TableHead>Registered Voters</TableHead>
                        <TableHead>SLP Votes</TableHead>
                        <TableHead>UWP Votes</TableHead>
                        <TableHead>IND Votes</TableHead>
                        <TableHead>Total Votes</TableHead>
                        <TableHead>Turnout</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results && results.length > 0 ? results.map(result => {
                        const constituency = getConstituency(result.constituencyId);
                        const winner = result.slpVotes > result.uwpVotes ? 'SLP' : 'UWP';
                        return (
                            <TableRow key={result.id}>
                                <TableCell className="font-medium" style={{ color: winner === 'SLP' ? 'red': 'orange'}}>{constituency?.name}</TableCell>
                                <TableCell>{result.registeredVoters === 0 ? 'N/A' : result.registeredVoters.toLocaleString()}</TableCell>
                                <TableCell>{result.slpVotes.toLocaleString()}</TableCell>
                                <TableCell>{result.uwpVotes.toLocaleString()}</TableCell>
                                <TableCell>{result.otherVotes.toLocaleString()}</TableCell>
                                <TableCell className="font-semibold">{result.totalVotes.toLocaleString()}</TableCell>
                                <TableCell>{result.turnout === 0 ? 'N/A' : `${result.turnout}%`}</TableCell>
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
                            <TableCell colSpan={8} className="text-center text-muted-foreground h-24">No results found for this year.</TableCell>
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
