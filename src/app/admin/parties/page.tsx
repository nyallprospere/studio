

'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import type { Party, Election } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PartyForm } from './party-form';
import Image from 'next/image';
import { Shield, Pencil, Trash2, Link as LinkIcon, Upload } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionComponent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { uploadFile, deleteFile } from '@/firebase/storage';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IndependentLogoForm } from './independent-logo-form';

export default function AdminPartiesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const { data: parties, isLoading } = useCollection<Party>(partiesCollection);

  const currentElectionQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), where('isCurrent', '==', true)) : null, [firestore]);
  const { data: currentElections, isLoading: loadingElections } = useCollection<Election>(currentElectionQuery);
  const currentElection = useMemo(() => currentElections?.[0], [currentElections]);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [isIndependentLogoFormOpen, setIsIndependentLogoFormOpen] = useState(false);


  const handleFormSubmit = async (values: any) => {
    if (!firestore || !partiesCollection) return;
    
    let logoUrl = values.logoUrl;
    let expandedLogoUrl = values.expandedLogoUrl;
    let oldLogoUrl = values.oldLogoUrl;
    let manifestoUrl = values.manifestoUrl;

    try {
      if (values.logoFile) {
        if(editingParty?.logoUrl) await deleteFile(editingParty.logoUrl).catch(console.warn);
        logoUrl = await uploadFile(values.logoFile, `parties/${values.logoFile.name}`);
      }
      if (values.expandedLogoFile) {
        if(editingParty?.expandedLogoUrl) await deleteFile(editingParty.expandedLogoUrl).catch(console.warn);
        expandedLogoUrl = await uploadFile(values.expandedLogoFile, `parties/expanded_${values.expandedLogoFile.name}`);
      }
      if (values.oldLogoFile) {
        if(editingParty?.oldLogoUrl) await deleteFile(editingParty.oldLogoUrl).catch(console.warn);
        oldLogoUrl = await uploadFile(values.oldLogoFile, `parties/old_${values.oldLogoFile.name}`);
      }
      if (values.manifestoFile) {
        if(editingParty?.manifestoUrl) await deleteFile(editingParty.manifestoUrl).catch(console.warn);
        manifestoUrl = await uploadFile(values.manifestoFile, `parties/${values.manifestoFile.name}`);
      }

      const partyData = {
        ...values,
        founded: Number(values.founded),
        logoUrl,
        expandedLogoUrl,
        oldLogoUrl,
        manifestoUrl,
      };
      delete partyData.logoFile;
      delete partyData.expandedLogoFile;
      delete partyData.oldLogoFile;
      delete partyData.manifestoFile;

      if (editingParty) {
        const partyDoc = doc(firestore, 'parties', editingParty.id);
        await updateDoc(partyDoc, partyData);
        toast({ title: "Party Updated", description: `${partyData.name} has been successfully updated.` });
      } else {
        await addDoc(partiesCollection, partyData);
        toast({ title: "Party Added", description: `${partyData.name} has been successfully added.` });
      }
    } catch (error) {
      console.error("Error during file upload or Firestore operation: ", error);
      toast({ variant: "destructive", title: "Operation Failed", description: "Could not save party details. Check console for errors." });
    } finally {
      setIsFormOpen(false);
      setEditingParty(null);
    }
  };

  const handleIndependentLogoSubmit = async (values: any) => {
    if (!firestore || !currentElection) return;

    try {
      let independentLogoUrl = values.independentLogoUrl || currentElection.independentLogoUrl;
      if (values.independentLogoFile) {
        if (currentElection.independentLogoUrl) await deleteFile(currentElection.independentLogoUrl);
        independentLogoUrl = await uploadFile(values.independentLogoFile, `logos/independent_${currentElection.year}.png`);
      }

      let independentExpandedLogoUrl = values.independentExpandedLogoUrl || currentElection.independentExpandedLogoUrl;
      if (values.independentExpandedLogoFile) {
        if (currentElection.independentExpandedLogoUrl) await deleteFile(currentElection.independentExpandedLogoUrl);
        independentExpandedLogoUrl = await uploadFile(values.independentExpandedLogoFile, `logos/independent_expanded_${currentElection.year}.png`);
      }

      const electionDocRef = doc(firestore, 'elections', currentElection.id);
      const dataToUpdate = { independentLogoUrl, independentExpandedLogoUrl };
      
      updateDoc(electionDocRef, dataToUpdate)
        .then(() => {
          toast({ title: "Independent Logos Updated", description: "The logos for independent candidates have been updated." });
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({ path: electionDocRef.path, operation: 'update', requestResourceData: dataToUpdate });
            errorEmitter.emit('permission-error', contextualError);
        });

    } catch (error) {
       console.error("Error saving independent logos: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save independent logos." });
    } finally {
      setIsIndependentLogoFormOpen(false);
    }

  };

  const handleDelete = async (party: Party) => {
    if (!firestore) return;

    if(party.logoUrl) await deleteFile(party.logoUrl).catch(console.warn);
    if(party.expandedLogoUrl) await deleteFile(party.expandedLogoUrl).catch(console.warn);
    if(party.oldLogoUrl) await deleteFile(party.oldLogoUrl).catch(console.warn);
    if(party.manifestoUrl) await deleteFile(party.manifestoUrl).catch(console.warn);

    const partyDoc = doc(firestore, 'parties', party.id);
    deleteDoc(partyDoc)
        .then(() => {
            toast({ title: "Party Deleted", description: `${party.name} has been deleted.` });
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({ path: partyDoc.path, operation: 'delete' });
            errorEmitter.emit('permission-error', contextualError);
        });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Parties"
          description="Add, edit, or remove political parties."
        />
        <div className="flex items-center gap-2">
          
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingParty(null); setIsFormOpen(true)}}>Add New Party</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-full">
                <div className="pr-6">
                  <PartyForm
                    onSubmit={handleFormSubmit}
                    initialData={editingParty}
                    onCancel={() => setIsFormOpen(false)}
                  />
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Parties</CardTitle>
          <CardDescription>A list of all political parties currently in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading parties...</p>
          ) : (
            <div className="space-y-4">
              {parties && parties.length > 0 ? (
                parties.map((party) => (
                  <div key={party.id} className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      {party.logoUrl ? (
                        <Image src={party.logoUrl} alt={party.name} width={48} height={48} className="rounded-full object-contain" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Shield className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold" style={{ color: party.color }}>{party.name} ({party.acronym})</p>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>Leader: {party.leader}</span>
                          {party.website && (
                            <>
                              <span>&bull;</span>
                              <Link href={party.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                <LinkIcon className="h-3 w-3" />
                                Website
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" onClick={() => { setEditingParty(party); setIsFormOpen(true);}}>
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
                              <AlertDialogDescriptionComponent>
                                This will permanently delete the party "{party.name}" and all associated data. This action cannot be undone.
                              </AlertDialogDescriptionComponent>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(party)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No parties have been added yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
