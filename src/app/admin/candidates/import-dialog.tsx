
'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Party, Constituency, Election } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[], electionId?: string) => void;
  parties: Party[];
  constituencies: Constituency[];
  elections?: Election[];
  isArchiveImport?: boolean;
}

const REQUIRED_HEADERS = ['firstName', 'lastName', 'party', 'constituency'];

export function ImportDialog({ isOpen, onClose, onImport, parties, constituencies, elections, isArchiveImport }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          toast({ variant: 'destructive', title: 'Invalid File', description: 'The file must contain at least one header row and one data row.' });
          resetState();
          return;
        }

        const fileHeaders = jsonData[0];
        const fileData = jsonData.slice(1).map(row => {
          const rowData: Record<string, any> = {};
          fileHeaders.forEach((header: string, index: number) => {
            rowData[header] = row[index];
          });
          return rowData;
        });

        setHeaders(fileHeaders);
        setParsedData(fileData);
        // Auto-map headers
        const initialMapping: Record<string, string> = {};
        fileHeaders.forEach(header => {
            const normalizedHeader = header.toLowerCase().replace(/\s/g, '');
            if (REQUIRED_HEADERS.includes(normalizedHeader)) {
                initialMapping[header] = normalizedHeader;
            }
             if (normalizedHeader === 'partylevel') {
                initialMapping[header] = 'partyLevel';
            }
        });
        setMapping(initialMapping);

      } catch (error) {
        toast({ variant: 'destructive', title: 'File Parsing Error', description: 'Could not read or parse the file.' });
        resetState();
      }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'There was an error reading the file.' });
        resetState();
    };
    reader.readAsBinaryString(fileToParse);
  };
  
  const handleMappingChange = (header: string, value: string) => {
    setMapping(prev => ({...prev, [header]: value}));
  }

  const handleImportClick = () => {
    if(!parsedData) return;
    
    if (isArchiveImport && !selectedElectionId) {
        toast({ variant: 'destructive', title: 'Election Not Selected', description: 'Please select an election to import the archive for.' });
        return;
    }

    const mappedData = parsedData.map(row => {
        const newRow: Record<string, any> = {};
        for(const header in mapping) {
            newRow[mapping[header]] = row[header];
        }
        return newRow;
    });

    onImport(mappedData, selectedElectionId);
    resetState();
    onClose();
  };

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setHeaders([]);
    setMapping({});
    setSelectedElectionId('');
  }

  const handleClose = () => {
    resetState();
    onClose();
  }

  const isMappingComplete = REQUIRED_HEADERS.every(requiredField => Object.values(mapping).includes(requiredField));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Candidates</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file. Then map the columns from your file to the required candidate fields.
          </DialogDescription>
        </DialogHeader>
        
        {!parsedData ? (
            <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8">
                <Input
                    id="file-upload"
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="w-full max-w-xs"
                />
                 <p className="text-sm text-muted-foreground mt-4">Required columns: firstName, lastName, party, constituency.</p>
            </div>
        ) : (
            <div className="flex-grow flex flex-col min-h-0">
                {isArchiveImport && elections && (
                    <div className="mb-4">
                        <label htmlFor="election-select" className="text-sm font-medium">Select Election for Import</label>
                        <Select value={selectedElectionId} onValueChange={setSelectedElectionId}>
                            <SelectTrigger id="election-select" className="w-full mt-1">
                                <SelectValue placeholder="Select an election year..." />
                            </SelectTrigger>
                            <SelectContent>
                                {elections.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <h3 className="text-lg font-medium mb-2">Map Fields</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Match the columns from your file to the destination fields in the database.
                </p>
                 <ScrollArea className="flex-grow">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Your File Column</TableHead>
                                <TableHead>Destination Field</TableHead>
                                <TableHead>Preview</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {headers.map(header => (
                                <TableRow key={header}>
                                    <TableCell className="font-medium">{header}</TableCell>
                                    <TableCell>
                                        <Select value={mapping[header]} onValueChange={(value) => handleMappingChange(header, value)}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Select a field" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="--ignore--">-- Ignore --</SelectItem>
                                                <SelectItem value="firstName">First Name</SelectItem>
                                                <SelectItem value="lastName">Last Name</SelectItem>
                                                <SelectItem value="party">Party (Name or Acronym)</SelectItem>
                                                <SelectItem value="constituency">Constituency</SelectItem>
                                                <SelectItem value="bio">Bio</SelectItem>
                                                <SelectItem value="isIncumbent">Is Incumbent (Yes/No)</SelectItem>
                                                <SelectItem value="isPartyLeader">Is Party Leader (Yes/No)</SelectItem>
                                                <SelectItem value="isDeputyLeader">Is Deputy Leader (Yes/No)</SelectItem>
                                                <SelectItem value="partyLevel">Party Level (higher/lower)</SelectItem>
                                                <SelectItem value="imageUrl">Image URL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-xs">
                                        {parsedData[0]?.[header]}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImportClick} disabled={!parsedData || !isMappingComplete || (isArchiveImport && !selectedElectionId)}>
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
