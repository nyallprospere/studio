'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { VoterInformationForm, type VoterInformation } from './voter-information-form';

export default function VoterInformationPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const voterInfoQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'voter_information'), orderBy('title')) : null, [firestore]);
  const { data: voterInfoItems, isLoading } = useCollection<VoterInformation>(voterInfoQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VoterInformation | null>(null);

  const handleFormSubmit = async (values: VoterInformation) => {
    if (!firestore) return;
    
    if (editingItem) {
      const itemDoc = doc(firestore, 'voter_information', editingItem.id);
      updateDoc(itemDoc, values)
        .then(() => toast({ title: "Section Updated", description: `The "${values.title}" section has been updated.` }))
        .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemDoc.path, operation: 'update', requestResourceData: values }));
        });
    } else {
      const voterInfoCollection = collection(firestore, 'voter_information');
      addDoc(voterInfoCollection, values)
        .then(() => toast({ title: "Section Added", description: `The "${values.title}" section has been added.` }))
        .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: voterInfoCollection.path, operation: 'create', requestResourceData: values }));
        });
    }
    
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (item: VoterInformation) => {
    if (!firestore) return;
    const itemDoc = doc(firestore, 'voter_information', item.id);
    deleteDoc(itemDoc)
      .then(() => toast({ title: "Section Deleted", description: `The "${item.title}" section has been deleted.` }))
      .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemDoc.path, operation: 'delete' }));
      });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Voter Information"
          description="Add, edit, or remove sections from the voter information card on the homepage."
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); setIsFormOpen(true) }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Section' : 'Add New Section'}</DialogTitle>
            </DialogHeader>
            <VoterInformationForm
              onSubmit={handleFormSubmit}
              initialData={editingItem}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Information Sections</CardTitle>
          <CardDescription>The sections displayed on the homepage.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : (
            <div className="space-y-4">
              {voterInfoItems && voterInfoItems.length > 0 ? (
                voterInfoItems.map(item => (
                  <div key={item.id} className="flex items-start justify-between p-4 border rounded-md">
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <ul className="list-disc list-inside text-muted-foreground mt-2 text-sm">
                        {item.items.map((text, index) => <li key={index}>{text}</li>)}
                      </ul>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsFormOpen(true);}}>
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
                              <AlertDialogDescription>This will permanently delete the "{item.title}" section.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground">No voter information sections created yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
