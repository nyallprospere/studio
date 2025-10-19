

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Lock, Unlock, Upload, Download } from 'lucide-react';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isEqual } from 'lodash';
import { ImportDialog } from './import-dialog';
import * as XLSX from 'xlsx';

const initialConstituencies = [
    { name: "Castries Central", registeredVoters: 0 },
    { name: "Castries East", registeredVoters: 0 },
    { name: "Castries North", registeredVoters: 0 },
    { name: "Castries South", registeredVoters: 0 },
    { name: "Castries South East", registeredVoters: 0 },
    { name: "Anse la Raye/Canaries", registeredVoters: 0 },
    { name: "Babonneau", registeredVoters: 0 },
    { name: "Choiseul", registeredVoters: 0 },
    { name: "Dennery North", registeredVoters: 0 },
    { name: "Dennery South", registeredVoters: 0 },
    { name: "Gros Islet", registeredVoters: 0 },
    { name: "Laborie", registeredVoters: 0 },
    { name: "Micoud North", registeredVoters: 0 },
    { name: "Micoud South", registeredVoters: 0 },
    { name: "Soufriere", registeredVoters: 0 },
    { name: "Vieux Fort North", registeredVoters: 0 },
    { name: "Vieux Fort South", registeredVoters: 0 },
];

const politicalLeaningOptions = [
  { value: 'solid-slp', label: 'Solid SLP' },
  { value: 'lean-slp', label: 'Lean SLP' },
  { value: 'tossup', label: 'Tossup' },
  { value: 'lean-uwp', label: 'Lean UWP' },
  { value: 'solid-uwp', label: 'Solid UWP' },
];


export default function AdminConstituenciesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies, error } = useCollection<Constituency>(constituenciesCollection);
    
    const [editableConstituencies, setEditableConstituencies] = useState<Constituency[]>([]);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);


    const hasUnsavedChanges = useMemo(() => {
        if (!constituencies || !editableConstituencies || constituencies.length !== editableConstituencies.length) return false;
        
        const sortedOriginal = [...constituencies].sort((a, b) => a.id.localeCompare(b.id));
        const sortedEditable = [...editableConstituencies].sort((a, b) => a.id.localeCompare(b.id));
        
        return !isEqual(sortedOriginal, sortedEditable);
    }, [constituencies, editableConstituencies]);

    
    useEffect(() => {
        if(constituencies) {
            setEditableConstituencies(JSON.parse(JSON.stringify(constituencies)));
        }
    }, [constituencies]);

    const handleSeedConstituencies = async () => {
        if (!firestore) return;
        setIsSeeding(true);
        try {
            if (constituencies && constituencies.length > 0) {
                toast({ title: 'Seeding Skipped', description: 'Constituencies already exist.' });
                return;
            }
            const batch = writeBatch(firestore);
            initialConstituencies.forEach(c => {
                const docRef = doc(collection(firestore, 'constituencies'));
                batch.set(docRef, { 
                    name: c.name, 
                    demographics: { registeredVoters: c.registeredVoters },
                    mapCoordinates: { top: "50", left: "50"}, // Default coordinates
                    politicalLeaning: "tossup",
                    predictedSlpPercentage: 50,
                    predictedUwpPercentage: 50,
                });
            });
            await batch.commit();
            toast({ title: 'Success', description: 'Seeded 17 constituencies.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not seed constituencies.' });
        } finally {
            setIsSeeding(false);
        }
    }
    
    const handleLeaningChange = useCallback((id: string, newLeaning: string) => {
        setEditableConstituencies(prev =>
            prev.map(c =>
                c.id === id ? { ...c, politicalLeaning: newLeaning as Constituency['politicalLeaning'] } : c
            )
        );
    }, []);

    const handlePredictionChange = useCallback((id: string, slp: number) => {
        const uwp = 100 - slp;
        setEditableConstituencies(prev =>
            prev.map(c =>
                c.id === id ? { ...c, predictedSlpPercentage: slp, predictedUwpPercentage: uwp } : c
            )
        );
    }, []);


    const handleFieldChange = (id: string, field: keyof Constituency | 'registeredVoters', value: any) => {
        setEditableConstituencies(prev => 
            prev.map(c => {
                if (c.id === id) {
                    if (field === 'registeredVoters') {
                        return { ...c, demographics: { ...c.demographics, registeredVoters: Number(value) } };
                    }
                    if (field === 'predictedSlpPercentage') {
                        const slp = Number(value);
                        const uwp = 100 - slp;
                        return { ...c, predictedSlpPercentage: slp, predictedUwpPercentage: uwp };
                    }
                     if (field === 'predictedUwpPercentage') {
                        const uwp = Number(value);
                        const slp = 100 - uwp;
                        return { ...c, predictedSlpPercentage: slp, predictedUwpPercentage: uwp };
                    }
                    return { ...c, [field]: value };
                }
                return c;
            })
        );
    };

    const handleSaveAll = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            editableConstituencies.forEach(c => {
                const { id, ...dataToSave } = c;
                const docRef = doc(firestore, 'constituencies', id);
                batch.update(docRef, dataToSave);
            });
            await batch.commit();
            toast({ title: 'Success', description: 'All changes have been saved.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save changes.' });
        } finally {
            setIsSaving(false);
        }
    }

    const handleExport = () => {
        if (!constituencies) {
          toast({ variant: "destructive", title: "Error", description: "Data not loaded yet." });
          return;
        }
        const dataToExport = constituencies.map(c => ({
          'Name': c.name,
          'Registered Voters': c.demographics?.registeredVoters || 0,
          'Political Leaning': c.politicalLeaning || 'tossup',
          'Predicted SLP %': c.predictedSlpPercentage || 50,
          'Predicted UWP %': c.predictedUwpPercentage || 50,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Constituencies");
        XLSX.writeFile(workbook, "constituencies.xlsx");
        toast({ title: "Export Successful", description: "Constituencies have been exported." });
      }
    
      const handleImport = async (data: any[]) => {
        if (!firestore) {
          toast({ variant: 'destructive', title: 'Error', description: 'Database not ready.' });
          return;
        }
    
        try {
            const batch = writeBatch(firestore);
            let count = 0;
            
            const constituenciesCollection = collection(firestore, 'constituencies');
            const existingConstituenciesSnap = await getDocs(constituenciesCollection);
            const existingConstituenciesMap = new Map(existingConstituenciesSnap.docs.map(doc => [doc.data().name, doc.id]));

            for (const row of data) {
                if (!row.name) {
                    console.warn(`Skipping row due to missing name:`, row);
                    continue;
                }
                
                const docId = existingConstituenciesMap.get(row.name);
                const docRef = docId ? doc(firestore, 'constituencies', docId) : doc(constituenciesCollection);
                
                const updatedConstituency = {
                    name: row.name,
                    demographics: { registeredVoters: Number(row.registeredVoters) || 0 },
                    politicalLeaning: row.politicalLeaning || 'tossup',
                    predictedSlpPercentage: Number(row.predictedSlpPercentage) || 50,
                    predictedUwpPercentage: Number(row.predictedUwpPercentage) || 50,
                };
    
                if (docId) {
                    batch.update(docRef, updatedConstituency);
                } else {
                    batch.set(docRef, updatedConstituency);
                }
                count++;
            }
    
            await batch.commit();
            toast({ title: 'Import Successful', description: `${count} constituencies imported/updated successfully.` });
    
        } catch(e) {
            console.error("Error importing constituencies:", e);
            toast({ variant: 'destructive', title: 'Import Failed', description: 'An error occurred during import. Check console for details.' });
        } finally {
            setIsImportOpen(false);
        }
      };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-start mb-8">
                <PageHeader
                title="Manage Constituencies"
                description="Update details for each electoral district."
                />
                 <div className="flex items-center gap-2">
                    {(constituencies === null || constituencies?.length === 0) && (
                        <Button onClick={handleSeedConstituencies} disabled={isSeeding}>
                            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Seed Constituencies
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={!constituencies || constituencies.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button onClick={handleSaveAll} disabled={isSaving || !hasUnsavedChanges}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>
            
            <ImportDialog
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onImport={handleImport}
            />

            <div className="grid grid-cols-1 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Map Preview</CardTitle>
                        <CardDescription>
                            Click a constituency on the map to edit its details in the table below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <InteractiveSvgMap 
                            constituencies={editableConstituencies} 
                            selectedConstituencyId={selectedConstituencyId}
                            onConstituencyClick={setSelectedConstituencyId}
                            onLeaningChange={handleLeaningChange}
                            onPredictionChange={handlePredictionChange}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Constituency Data</CardTitle>
                        <CardDescription>Edit voter numbers, leanings, and predictions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingConstituencies ? <p>Loading...</p> : 
                        error ? <p className="text-destructive">Error: {error.message}</p> :
                        editableConstituencies && editableConstituencies.length > 0 ? (
                            <ScrollArea className="h-[70vh]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Registered Voters</TableHead>
                                        <TableHead>Political Leaning</TableHead>
                                        <TableHead>Pred. SLP %</TableHead>
                                        <TableHead>Pred. UWP %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {editableConstituencies.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                        <TableRow key={c.id} className={c.id === selectedConstituencyId ? 'bg-muted' : ''}>
                                            <TableCell className="font-medium whitespace-nowrap">{c.name}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={c.demographics?.registeredVoters || 0}
                                                    onChange={(e) => handleFieldChange(c.id, 'registeredVoters', e.target.value)}
                                                    className="w-28"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select 
                                                    value={c.politicalLeaning} 
                                                    onValueChange={(value) => handleFieldChange(c.id, 'politicalLeaning', value)}
                                                >
                                                    <SelectTrigger className="w-40">
                                                        <SelectValue placeholder="Select leaning" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {politicalLeaningOptions.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={c.predictedSlpPercentage || 0}
                                                    onChange={(e) => handleFieldChange(c.id, 'predictedSlpPercentage', e.target.value)}
                                                    className="w-24"
                                                    min="0"
                                                    max="100"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={c.predictedUwpPercentage || 0}
                                                    onChange={(e) => handleFieldChange(c.id, 'predictedUwpPercentage', e.target.value)}
                                                    className="w-24"
                                                    min="0"
                                                    max="100"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </ScrollArea>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No constituencies found.</p>
                                <p className="text-sm text-muted-foreground">You can seed the initial 17 constituencies.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
