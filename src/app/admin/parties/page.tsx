'use client';

import { useState } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import type { Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PartyForm } from './party-form';
import Image from 'next/image';
import { Shield, Pencil, Trash2 } from 'lucide-react';
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
import { uploadFile, deleteFile } from '@/firebase/storage';
import { useToast } from '@/hooks/use-toast';

export default function AdminPartiesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const partiesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const { data: parties, isLoading } = useCollection<Party>(partiesCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const handleFormSubmit = async (values: any) => {
    try {
      let logoUrl = values.logoUrl;
      if (values.logoFile) {
        if(editingParty?.logoUrl) {
            await deleteFile(editingParty.logoUrl);
        }
        logoUrl = await uploadFile(values.logoFile, `parties/${values.logoFile.name}`);
      }

      let manifestoUrl = values.manifestoUrl;
      if (values.manifestoFile) {
        if(editingParty?.manifestoUrl) {
            await deleteFile(editingParty.manifestoUrl);
        }
        manifestoUrl = await uploadFile(values.manifestoFile, `parties/${values.manifestoFile.name}`);
      }

      const partyData = {
        ...values,
        founded: Number(values.founded),
        logoUrl,
        manifestoUrl,
      };
      delete partyData.logoFile;
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
      console.error("Error saving party: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save party. Check console for details." });
    } finally {
      setIsFormOpen(false);
      setEditingParty(null);
    }
  };

  const handleDelete = async (party: Party) => {
    try {
      if(party.logoUrl) await deleteFile(party.logoUrl);
      if(party.manifestoUrl) await deleteFile(party.manifestoUrl);

      const partyDoc = doc(firestore, 'parties', party.id);
      await deleteDoc(partyDoc);
      toast({ title: "Party Deleted", description: `${party.name} has been deleted.` });
    } catch (error) {
        console.error("Error deleting party: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete party." });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <PageHeader
          title="Manage Parties"
          description="Add, edit, or remove political parties."
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingParty(null); setIsFormOpen(true)}}>Add New Party</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</DialogTitle>
            </DialogHeader>
            <PartyForm
              onSubmit={handleFormSubmit}
              initialData={editingParty}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
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
                        <p className="text-sm text-muted-foreground">Leader: {party.leader}</p>
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
                              <AlertDialogDescription>
                                This will permanently delete the party "{party.name}" and all associated data. This action cannot be undone.
                              </AlertDialogDescription>
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
