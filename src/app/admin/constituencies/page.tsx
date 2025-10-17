
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { InteractiveMap } from '@/components/interactive-map';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    
    useEffect(() => {
        if(constituencies) {
            setEditableConstituencies(constituencies);
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
                    politicalLeaning: "tossup"
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

    const handleCoordinatesChange = useCallback((id: string, newCoords: { top: string; left: string }) => {
        setEditableConstituencies(prev =>
            prev.map(c => 
                c.id === id ? { ...c, mapCoordinates: { top: newCoords.top, left: newCoords.left } } : c
            )
        );
    }, []);


    const handleFieldChange = (id: string, field: keyof Constituency | 'registeredVoters' | 'top' | 'left', value: any) => {
        setEditableConstituencies(prev => 
            prev.map(c => {
                if (c.id === id) {
                    if (field === 'registeredVoters') {
                        return { ...c, demographics: { ...c.demographics, registeredVoters: Number(value) } };
                    }
                     if (field === 'top' || field === 'left') {
                        return { ...c, mapCoordinates: { ...c.mapCoordinates, [field]: value } };
                    }
                    return { ...c, [field]: value };
                }
                return c;
            })
        );
    };

    const handleSave = async (constituency: Constituency) => {
        if (!firestore) return;
        try {
            const { id, ...dataToSave } = constituency;
            const docRef = doc(firestore, 'constituencies', id);
            await updateDoc(docRef, dataToSave);
            toast({ title: 'Saved', description: `${constituency.name} has been updated.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: `Could not save ${constituency.name}.` });
        }
    };
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-start mb-8">
                <PageHeader
                title="Manage Constituencies"
                description="Update details for each electoral district."
                />
                 {(constituencies === null || constituencies?.length === 0) && (
                     <Button onClick={handleSeedConstituencies} disabled={isSeeding}>
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Seed Constituencies
                    </Button>
                 )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div>
                     <Card>
                        <CardHeader>
                            <CardTitle>Map Preview</CardTitle>
                             <CardDescription>Drag the labels to adjust their positions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="sticky top-4">
                                <InteractiveMap 
                                    constituencies={editableConstituencies} 
                                    onCoordinatesChange={handleCoordinatesChange}
                                    isDraggable
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Constituency Data</CardTitle>
                            <CardDescription>Edit voter numbers, map positions, and political leanings.</CardDescription>
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
                                            <TableHead>Map Top %</TableHead>
                                            <TableHead>Map Left %</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {editableConstituencies.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">{c.name}</TableCell>
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
                                                        type="text"
                                                        value={c.mapCoordinates?.top || ''}
                                                        onChange={(e) => handleFieldChange(c.id, 'top', e.target.value)}
                                                        className="w-20"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="text"
                                                        value={c.mapCoordinates?.left || ''}
                                                        onChange={(e) => handleFieldChange(c.id, 'left', e.target.value)}
                                                        className="w-20"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => handleSave(c)}>Save</Button>
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
        </div>
    );
}
