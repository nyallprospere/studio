'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, query } from 'firebase/firestore';
import type { Region, Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RegionForm } from './region-form';
import { Pencil, Trash2, Lock, Unlock } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminRegionsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const regionsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'regions') : null, [firestore]);
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  
  const { data: regions, isLoading: loadingRegions } = useCollection<Region>(regionsCollection);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [isLocked, setIsLocked] = useState(true);

  const sortedRegions = useMemo(() => {
    if (!regions) return [];
    return [...regions].sort((a, b) => a.name.localeCompare(b.name));
  }, [regions]);

  const handleFormSubmit = async (values: { name: string, constituencyIds?: string[] }) => {
    if (!firestore || !regionsCollection) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }

    const dataToSave = {
        name: values.name,
        constituencyIds: values.constituencyIds || []
    };
    
    if (editingRegion) {
      const regionDoc = doc(firestore, 'regions', editingRegion.id);
      updateDoc(regionDoc, dataToSave)
        .then(() => {
          toast({ title: "Region Updated", description: `The region "${values.name}" has been successfully updated.` });
        })
        .catch(error => {
          const contextualError = new FirestorePermissionError({
            path: regionDoc.path,
            operation: 'update',
            requestResourceData: dataToSave,
          });
          errorEmitter.emit('permission-error', contextualError);
        });
    } else {
        addDoc(regionsCollection, dataToSave)
            .then(() => {
            toast({ title: "Region Added", description: `The region "${values.name}" has been successfully added.` });
            })
            .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: regionsCollection.path,
                operation: 'create',
                requestResourceData: dataToSave,
            });
            errorEmitter.emit('permission-error', contextualError);
        });
    }
    
    setIsFormOpen(false);
    setEditingRegion(null);
  };

  const handleDelete = async (region: Region) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }
    const regionDoc = doc(firestore, 'regions', region.id);
    deleteDoc(regionDoc)
      .then(() => {
        toast({ title: "Region Deleted", description: `The region "${region.name}" has been deleted.` });
      })
      .catch(error => {
        const contextualError = new FirestorePermissionError({
          path: regionDoc.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  };

  const getConstituencyName = (id: string) => {
    return constituencies?.find(c => c.id === id)?.name || 'Unknown';
  };

  const isLoading = loadingRegions || loadingConstituencies;

  return (
    <div className="container mx-auto px-4 py-8">
    <div className="flex justify-between items-start mb-8">
        <PageHeader
        title="Manage Regions"
        description="Add, edit, or remove regions."
        />
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsLocked(!isLocked)}
                disabled={!regions || regions.length === 0}
            >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => { setEditingRegion(null); setIsFormOpen(true)}} disabled={isLocked}>Add New Region</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl h-[80vh]">
                <DialogHeader>
                <DialogTitle>{editingRegion ? 'Edit Region' : 'Add New Region'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-full pr-6">
                    <RegionForm
                        onSubmit={handleFormSubmit}
                        initialData={editingRegion}
                        onCancel={() => setIsFormOpen(false)}
                        allConstituencies={constituencies || []}
                        allRegions={regions || []}
                    />
                </ScrollArea>
            </DialogContent>
        </Dialog>
        </div>
    </div>

    <Card>
        <CardHeader>
        <CardTitle>Existing Regions</CardTitle>
        <CardDescription>A list of all regions currently in the system.</CardDescription>
        </CardHeader>
        <CardContent>
        {isLoading ? (
            <p>Loading regions...</p>
        ) : (
            <div className="space-y-4">
            {sortedRegions && sortedRegions.length > 0 ? (
                sortedRegions.map((region) => (
                <div key={region.id} className="flex items-start justify-between p-4 border rounded-md hover:bg-muted/50">
                    <div>
                        <p className="font-semibold">{region.name}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {region.constituencyIds && region.constituencyIds.map(cId => (
                                <Badge key={cId} variant="secondary">{getConstituencyName(cId)}</Badge>
                            ))}
                            {(!region.constituencyIds || region.constituencyIds.length === 0) && (
                                <p className="text-xs text-muted-foreground">No constituencies assigned.</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingRegion(region); setIsFormOpen(true);}} disabled={isLocked}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isLocked}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the region "{region.name}". This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(region)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                ))
            ) : (
                <p className="text-center text-muted-foreground py-8">No regions have been added yet.</p>
            )}
            </div>
        )}
        </CardContent>
    </Card>
    </div>
  );
}
