

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, updateDoc, writeBatch, getDocs, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Upload, Download, BrainCircuit, Calendar as CalendarIcon } from 'lucide-react';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isEqual } from 'lodash';
import { ImportDialog } from './import-dialog';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';


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

const aiPartyOptions = [
    { value: 'slp', label: 'SLP' },
    { value: 'uwp', label: 'UWP' },
    { value: 'ind', label: 'IND' },
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
    const [date, setDate] = useState<DateRange | undefined>();
    const [datePreset, setDatePreset] = useState('day');


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

    useEffect(() => {
        handleDatePresetChange('day');
    }, [])

    const handleSeedConstituencies = async () => {
        if (!firestore) return;
        setIsSeeding(true);
        const batch = writeBatch(firestore);
        try {
            if (constituencies && constituencies.length > 0) {
                toast({ title: 'Seeding Skipped', description: 'Constituencies already exist.' });
                return;
            }
            initialConstituencies.forEach(c => {
                const docRef = doc(collection(firestore, 'constituencies'));
                const dataToSave = { 
                    name: c.name, 
                    demographics: { registeredVoters: c.registeredVoters },
                    mapCoordinates: { top: "50", left: "50"}, // Default coordinates
                    politicalLeaning: "tossup",
                    predictedSlpPercentage: 50,
                    predictedUwpPercentage: 50,
                    slpDashboardPopoverText: '',
                    uwpDashboardPopoverText: '',
                };
                batch.set(docRef, dataToSave);
            });
            await batch.commit();
            toast({ title: 'Success', description: 'Seeded 17 constituencies.' });
        } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: 'constituencies',
                operation: 'write',
            });
            errorEmitter.emit('permission-error', permissionError);
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
                    const updatedConstituency = { ...c };
                    if (field === 'registeredVoters') {
                        updatedConstituency.demographics = { ...updatedConstituency.demographics, registeredVoters: Number(value) };
                    } else if (field === 'predictedSlpPercentage') {
                        const slp = Number(value);
                        updatedConstituency.predictedSlpPercentage = slp;
                        updatedConstituency.predictedUwpPercentage = 100 - slp;
                    } else if (field === 'predictedUwpPercentage') {
                        const uwp = Number(value);
                        updatedConstituency.predictedUwpPercentage = uwp;
                        updatedConstituency.predictedSlpPercentage = 100 - uwp;
                    } else if (field === 'aiForecast' || field === 'volatilityIndex') {
                        (updatedConstituency as any)[field] = Number(value);
                    }
                    else {
                        // This handles slpDashboardPopoverText and uwpDashboardPopoverText directly
                        (updatedConstituency as any)[field] = value;
                    }
                    return updatedConstituency;
                }
                return c;
            })
        );
    };

    const handleSaveAll = async () => {
        if (!firestore) return;
        setIsSaving(true);
        const batch = writeBatch(firestore);
        editableConstituencies.forEach(c => {
            const { id, ...dataToSave } = c;
            const docRef = doc(firestore, 'constituencies', id);
            batch.update(docRef, dataToSave);
        });

        batch.commit()
            .then(() => {
                toast({ title: 'Success', description: 'All changes have been saved.' });
            })
            .catch(error => {
                const permissionError = new FirestorePermissionError({
                    path: 'constituencies',
                    operation: 'write',
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSaving(false);
            });
    }

    const handleSaveSnapshot = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            const snapshotData = {
                date: serverTimestamp(),
                constituencies: editableConstituencies,
            };
            await addDoc(collection(firestore, 'constituency_projections'), snapshotData);
            toast({ title: 'Snapshot Saved', description: "Today's projections have been saved." });
        } catch (e) {
             const permissionError = new FirestorePermissionError({
                path: 'constituency_projections',
                operation: 'create',
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSaving(false);
        }
    };


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
          'SLP Popover Text': c.slpDashboardPopoverText || '',
          'UWP Popover Text': c.uwpDashboardPopoverText || '',
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
                    slpDashboardPopoverText: row.slpDashboardPopoverText || '',
                    uwpDashboardPopoverText: row.uwpDashboardPopoverText || '',
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
            const permissionError = new FirestorePermissionError({
                path: 'constituencies',
                operation: 'write',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsImportOpen(false);
        }
      };

      const calculatePercentages = (forecast: number | undefined, party: 'slp' | 'uwp' | 'ind' | undefined) => {
        if (typeof forecast === 'undefined' || !party) {
            return { slp: 50, uwp: 50 }; // Default to 50/50 if no forecast
        }

        if (party === 'ind') {
            return { slp: 0, uwp: 0 };
        }

        const baseline = 50;
        let slpPercent = baseline;
        let uwpPercent = baseline;

        if (party === 'slp') {
            slpPercent = baseline + forecast / 2;
            uwpPercent = 100 - slpPercent;
        } else if (party === 'uwp') {
            uwpPercent = baseline + forecast / 2;
            slpPercent = 100 - uwpPercent;
        }

        return { slp: slpPercent, uwp: uwpPercent };
    };

     const handleDatePresetChange = (preset: string) => {
      setDatePreset(preset);
      const now = new Date();
      switch (preset) {
          case 'all':
              setDate(undefined);
              break;
          case 'day':
              setDate({ from: startOfDay(now), to: endOfDay(now) });
              break;
          case 'week':
              setDate({ from: startOfWeek(now), to: endOfWeek(now) });
              break;
          case 'month':
              setDate({ from: startOfMonth(now), to: endOfMonth(now) });
              break;
          case 'year':
              setDate({ from: startOfYear(now), to: endOfYear(now) });
              break;
          default:
              setDate(undefined);
      }
    }
    
    const getCardTitle = () => {
        if (!date) return 'Constituency Data for All Time';
        if (date.from && date.to) {
            if (format(date.from, 'PPP') === format(date.to, 'PPP')) {
                return `Constituency Data for ${format(date.from, 'MM/dd/yyyy')}`;
            }
            return `Constituency Data: ${format(date.from, 'MM/dd/yyyy')} - ${format(date.to, 'MM/dd/yyyy')}`;
        }
        if (date.from) {
             return `Constituency Data for ${format(date.from, 'MM/dd/yyyy')}`;
        }
        return 'Constituency Data';
    }


    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-start mb-8">
                <PageHeader
                title="Manage Projection Map"
                description="Update details for each electoral district to affect the main projection map."
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
                    <Button onClick={handleSaveSnapshot} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Daily Snapshot
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
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>{getCardTitle()}</CardTitle>
                                <CardDescription>Edit voter numbers, leanings, and predictions.</CardDescription>
                            </div>
                             <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                            "w-[260px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date?.from ? (
                                            date.to ? (
                                                <>
                                                {format(date.from, "LLL dd, y")} -{" "}
                                                {format(date.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(date.from, "LLL dd, y")
                                            )
                                            ) : (
                                            <span>Pick a date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={(range) => { setDate(range); setDatePreset('custom'); }}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Select value={datePreset} onValueChange={handleDatePresetChange}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue placeholder="Date Range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Time</SelectItem>
                                        <SelectItem value="day">Today</SelectItem>
                                        <SelectItem value="week">This Week</SelectItem>
                                        <SelectItem value="month">This Month</SelectItem>
                                        <SelectItem value="year">This Year</SelectItem>
                                        <SelectItem value="custom" disabled>Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
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
                                        <TableHead>SLP ODDS</TableHead>
                                        <TableHead>UWP ODDS</TableHead>
                                        <TableHead>SLP %</TableHead>
                                        <TableHead>UWP %</TableHead>
                                        <TableHead>AI Forecast</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {editableConstituencies.sort((a,b) => a.name.localeCompare(b.name)).map(c => {
                                        const { slp: slpPercent, uwp: uwpPercent } = calculatePercentages(c.aiForecast, c.aiForecastParty);
                                        return (
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
                                            <TableCell>{slpPercent.toFixed(1)}%</TableCell>
                                            <TableCell>{uwpPercent.toFixed(1)}%</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={c.aiForecastParty}
                                                        onValueChange={(value) => handleFieldChange(c.id, 'aiForecastParty', value)}
                                                    >
                                                        <SelectTrigger className="w-24">
                                                            <SelectValue placeholder="Party" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {aiPartyOptions.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            value={`${(c.aiForecast || 0) > 0 ? '+' : ''}${(c.aiForecast || 0).toFixed(1)}%`}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                const numValue = parseFloat(value.replace('%', '').replace('+', ''));
                                                                if (!isNaN(numValue)) {
                                                                    handleFieldChange(c.id, 'aiForecast', numValue);
                                                                } else if (value === '') {
                                                                    handleFieldChange(c.id, 'aiForecast', 0);
                                                                }
                                                            }}
                                                            className="w-24"
                                                        />
                                                     </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )})}
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
