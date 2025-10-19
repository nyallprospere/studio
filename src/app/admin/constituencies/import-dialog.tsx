
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => void;
}

const REQUIRED_HEADERS = ['name'];

export function ImportDialog({ isOpen, onClose, onImport }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
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
            if (normalizedHeader === 'name') initialMapping[header] = 'name';
            if (normalizedHeader.includes('voters')) initialMapping[header] = 'registeredVoters';
            if (normalizedHeader.includes('leaning')) initialMapping[header] = 'politicalLeaning';
            if (normalizedHeader.includes('slp')) initialMapping[header] = 'predictedSlpPercentage';
            if (normalizedHeader.includes('uwp')) initialMapping[header] = 'predictedUwpPercentage';
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

    const mappedData = parsedData.map(row => {
        const newRow: Record<string, any> = {};
        for(const header in mapping) {
            newRow[mapping[header]] = row[header];
        }
        return newRow;
    });

    onImport(mappedData);
    resetState();
    onClose();
  };

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setHeaders([]);
    setMapping({});
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
          <DialogTitle>Import Constituencies</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file. Then map the columns from your file to the required fields.
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
                 <p className="text-sm text-muted-foreground mt-4">Required column: name.</p>
                 <p className="text-sm text-muted-foreground mt-2">Optional columns: registeredVoters, politicalLeaning, predictedSlpPercentage, predictedUwpPercentage</p>
            </div>
        ) : (
            <div className="flex-grow flex flex-col min-h-0">
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
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Select a field" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="--ignore--">-- Ignore --</SelectItem>
                                                <SelectItem value="name">Name</SelectItem>
                                                <SelectItem value="registeredVoters">Registered Voters</SelectItem>
                                                <SelectItem value="politicalLeaning">Political Leaning</SelectItem>
                                                <SelectItem value="predictedSlpPercentage">Predicted SLP %</SelectItem>
                                                <SelectItem value="predictedUwpPercentage">Predicted UWP %</SelectItem>
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
          <Button onClick={handleImportClick} disabled={!parsedData || !isMappingComplete}>
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
