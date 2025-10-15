'use client';

import { useState, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { uploadFile } from '@/firebase/storage';

const electionYears = [
  "2021", "2016", "2011", "2006", "2001", "1997", "1992", 
  "1987 (Apr 30)", "1987 (April 6)", "1982", "1979", "1974",
];

export default function AdminResultsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const resultsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'election_results') : null, [firestore]);

  const { data: constituencies, isLoading: loadingConstituencies } = useCollection(constituenciesQuery);
  const { data: parties, isLoading: loadingParties } = useCollection(partiesQuery);
  const { data: electionResults, isLoading: loadingResults } = useCollection(resultsQuery);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) {
        toast({ variant: 'destructive', title: 'Import Failed', description: 'No file selected or Firestore not available.'});
        return;
    };
    
    setIsImporting(true);

    try {
        // 1. Upload file to Firebase Storage
        await uploadFile(file, `election-results-imports/${Date.now()}-${file.name}`);

        // 2. Read the file for processing
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
                
                // 3. Batch write to Firestore
                const batch = writeBatch(firestore);
                let recordsProcessed = 0;

                jsonData.forEach(row => {
                    // Basic validation
                    if (row['Election Year'] && row['Constituency'] && row['Candidate'] && row['Votes']) {
                       const resultRef = doc(collection(firestore, 'election_results'));
                       batch.set(resultRef, {
                            year: row['Election Year'],
                            constituencyName: row['Constituency'],
                            candidateName: row['Candidate'],
                            partyAcronym: row['Party'],
                            votes: row['Votes'],
                       });
                       recordsProcessed++;
                    }
                });

                if (recordsProcessed > 0) {
                    await batch.commit();
                    toast({
                        title: 'Import Successful',
                        description: `Successfully imported and saved ${recordsProcessed} records.`,
                    });
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'Import Failed',
                        description: 'No valid records found in the file. Check column names.',
                    });
                }

            } catch (error: any) {
                console.error('Processing Error:', error);
                toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: 'Could not parse or save the data. Error: ' + error.message,
                });
            } finally {
                setIsImporting(false);
                 if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);

    } catch (uploadError: any) {
        console.error('Upload Error:', uploadError);
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: 'Could not upload the file to storage. Error: ' + uploadError.message
        });
        setIsImporting(false);
    }
  };

  const handleExport = () => {
    if (!electionResults || !firestore) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No results to export or Firestore not ready.' });
        return;
    }
    setIsExporting(true);
    try {
        // Map data to a more friendly format for export
        const dataToExport = electionResults.map((result: any) => ({
            'Election Year': result.year,
            'Constituency': constituencies?.find(c => c.id === result.constituencyId)?.name || result.constituencyName,
            'Candidate': result.candidateName,
            'Party': parties?.find(p => p.id === result.partyId)?.acronym || result.partyAcronym,
            'Votes': result.votes,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Election Results");
        XLSX.writeFile(workbook, "Election_Results_Export.xlsx");

        toast({ title: 'Export Successful', description: 'Election results have been exported.' });
    } catch (error) {
        console.error("Export Error:", error);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'An error occurred during the export process.' });
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Election Results"
        description="Input individual results or bulk import/export data."
      />
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader>
            <CardTitle>Add Single Result</CardTitle>
            <CardDescription>Fill out the form to add one result. Forms are for demonstration purposes only.</CardDescription>
            </CardHeader>
            <CardContent>
            <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="result-year">Election Year</Label>
                        <Select>
                        <SelectTrigger id="result-year">
                            <SelectValue placeholder="Select an election" />
                        </SelectTrigger>
                        <SelectContent>
                            {electionYears.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="result-constituency">Constituency</Label>
                        <Select>
                            <SelectTrigger id="result-constituency">
                                <SelectValue placeholder="Select a constituency" />
                            </SelectTrigger>
                            <SelectContent>
                                {loadingConstituencies ? <SelectItem value="loading" disabled>Loading...</SelectItem> : constituencies?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="result-candidate">Candidate</Label>
                    <Input id="result-candidate" placeholder="Candidate Name" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="result-party">Party</Label>
                    <Select>
                        <SelectTrigger id="result-party">
                            <SelectValue placeholder="Select a party" />
                        </SelectTrigger>
                        <SelectContent>
                           {loadingParties ? <SelectItem value="loading" disabled>Loading...</SelectItem> : parties?.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="result-votes">Votes</Label>
                    <Input id="result-votes" type="number" placeholder="4500" />
                </div>
                </div>
                 <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Result</Button>
            </form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Bulk Data Management</CardTitle>
                <CardDescription>Import or export all election results using a CSV or Excel file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="w-full">
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Import from File
                    </Button>
                    <Button onClick={handleExport} variant="outline" disabled={isExporting || loadingResults} className="w-full">
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Export to Excel
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    For imports, ensure your file has columns like 'Election Year', 'Constituency', 'Candidate', 'Party', and 'Votes'.
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
