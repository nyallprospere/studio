
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Loader2, Edit, Trash2, View } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Party } from '@/lib/types';
import Image from 'next/image';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';

const partySchema = z.object({
  name: z.string().min(2, 'Party name must be at least 2 characters.'),
  acronym: z.string().min(1, 'Acronym is required.'),
  leader: z.string().min(2, 'Party leader is required.'),
  founded: z.coerce.number().min(1900, 'Year must be after 1900.').max(new Date().getFullYear(), 'Year cannot be in the future.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format.'),
  description: z.string().optional(),
  manifestoSummary: z.string().optional(),
});


export default function AdminPartiesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [logo, setLogo] = useState<File | null>(null);
  const [manifesto, setManifesto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

  const form = useForm<z.infer<typeof partySchema>>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      acronym: '',
      leader: '',
      founded: '' as any,
      color: '#000000',
      description: '',
      manifestoSummary: '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };
  
  const onSubmit = (values: z.infer<typeof partySchema>) => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
        return;
    }

    setIsSubmitting(true);
    toast({ title: 'Success!', description: 'The new party is being saved.' });

    const performSave = async () => {
        let logoUrl = '';
        let manifestoUrl = '';

        try {
            if (logo) {
                logoUrl = await uploadFile(logo, `party-logos/${Date.now()}-${logo.name}`);
            }
            if (manifesto) {
                manifestoUrl = await uploadFile(manifesto, `party-manifestos/${Date.now()}-${manifesto.name}`);
            }
        } catch (uploadError: any) {
            toast({ variant: 'destructive', title: 'Upload Error', description: uploadError.message || 'Failed to upload a file.' });
            setIsSubmitting(false);
            return;
        }

        const partyData = {
            ...values,
            logoUrl,
            manifestoUrl,
        };
        
        try {
            const partiesCollection = collection(firestore, 'parties');
            await addDoc(partiesCollection, partyData);
            toast({ title: 'Save Complete!', description: `${values.name} has been saved.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Database Error', description: 'Failed to save party to database.' });
        } finally {
            form.reset();
            setLogo(null);
            setManifesto(null);
            const logoInput = document.getElementById('logo') as HTMLInputElement;
            if (logoInput) logoInput.value = '';
            const manifestoInput = document.getElementById('manifesto') as HTMLInputElement;
            if (manifestoInput) manifestoInput.value = '';
            setIsSubmitting(false);
        }
    };

    performSave();
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Parties"
        description="Add or edit political party information."
      />
      <div className="space-y-8">
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                    <CardTitle>Add New Party</CardTitle>
                    <CardDescription>Fill out the form to add a new party to the database.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Party Name *</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="acronym"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Acronym *</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="leader"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Party Leader *</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="founded"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Year Founded *</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Party Color</FormLabel>
                                    <FormControl>
                                    <Input type="color" {...field} className="h-10 p-1" disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="A brief description of the party's history and ideology..." {...field} disabled={isSubmitting}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="manifestoSummary"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Manifesto Summary</FormLabel>
                                <FormControl>
                                <Textarea placeholder="A short summary of the key points in the party's manifesto..." {...field} disabled={isSubmitting}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="logo">Party Logo</Label>
                            <Input id="logo" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogo)} disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="manifesto">Party Manifesto (PDF)</Label>
                            <Input id="manifesto" type="file" accept=".pdf" onChange={(e) => handleFileChange(e, setManifesto)} disabled={isSubmitting}/>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {isSubmitting ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving in background...
                        </>
                    ) : (
                        'Save Party'
                    )}
                    </Button>
                </CardFooter>
                </form>
            </Form>
        </Card>
        
        <PartyList parties={parties} isLoading={loadingParties} />

      </div>
    </div>
  );
}

function PartyList({ parties, isLoading }: { parties: Party[] | null, isLoading: boolean }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const handleDelete = async (party: Party) => {
        if (!firestore) return;
        
        const partyRef = doc(firestore, 'parties', party.id);
        deleteDocumentNonBlocking(partyRef);

        const storage = getStorage();
        if (party.logoUrl) {
            const logoRef = ref(storage, party.logoUrl);
            deleteObject(logoRef).catch(e => console.error("Error deleting logo:", e));
        }
        if (party.manifestoUrl) {
            const manifestoRef = ref(storage, party.manifestoUrl);
            deleteObject(manifestoRef).catch(e => console.error("Error deleting manifesto:", e));
        }

        toast({ title: "Party Deleted", description: `${party.name} has been removed.`});
    };

    if (isLoading) {
        return <div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Parties</CardTitle>
                <CardDescription>View, edit, or delete the parties currently in the database.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Logo</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Leader</TableHead>
                            <TableHead>Files</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parties && parties.length > 0 ? (
                            parties.map(party => (
                                <TableRow key={party.id}>
                                    <TableCell>
                                        {party.logoUrl && <Image src={party.logoUrl} alt={party.name} width={40} height={40} className="rounded-full" />}
                                    </TableCell>
                                    <TableCell className="font-medium">{party.name} ({party.acronym})</TableCell>
                                    <TableCell>{party.leader}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col space-y-1">
                                            {party.logoUrl && <Link href={party.logoUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View Logo</Link>}
                                            {party.manifestoUrl && <Link href={party.manifestoUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View Manifesto</Link>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <EditPartyDialog party={party} />
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the party "{party.name}" and all associated files.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(party)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">No parties found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


function EditPartyDialog({ party }: { party: Party }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [newLogo, setNewLogo] = useState<File | null>(null);
    const [newManifesto, setNewManifesto] = useState<File | null>(null);

    const form = useForm<z.infer<typeof partySchema>>({
        resolver: zodResolver(partySchema),
        defaultValues: { ...party, founded: party.founded || ('' as any) },
    });
    
    useEffect(() => {
        if (open) {
            form.reset({ ...party, founded: party.founded || ('' as any) });
            setNewLogo(null);
            setNewManifesto(null);
        }
    }, [open, party, form]);

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const storage = getStorage();
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const onUpdate = (values: z.infer<typeof partySchema>) => {
        if (!firestore) return;
        
        setOpen(false);
        toast({ title: "Update Started", description: `Updating ${party.name} in the background.` });

        const performUpdate = async () => {
            let updatedData: any = { ...values };
            const storage = getStorage();

            try {
                if (newLogo) {
                    if (party.logoUrl) {
                        await deleteObject(ref(storage, party.logoUrl)).catch(e => console.warn("Old logo deletion failed, continuing...", e));
                    }
                    const logoUrl = await uploadFile(newLogo, `party-logos/${Date.now()}-${newLogo.name}`);
                    updatedData.logoUrl = logoUrl;
                }
                
                if (newManifesto) {
                    if (party.manifestoUrl) {
                        await deleteObject(ref(storage, party.manifestoUrl)).catch(e => console.warn("Old manifesto deletion failed, continuing...", e));
                    }
                    const manifestoUrl = await uploadFile(newManifesto, `party-manifestos/${Date.now()}-${newManifesto.name}`);
                    updatedData.manifestoUrl = manifestoUrl;
                }

                const partyRef = doc(firestore, 'parties', party.id);
                await updateDoc(partyRef, updatedData);
                
                toast({ title: "Update Successful", description: `${party.name} has been updated.` });

            } catch (error: any) {
                console.error("Update failed:", error);
                const description = error.message || 'An unknown error occurred during the update.';
                toast({ variant: 'destructive', title: 'Update Failed', description });
            } finally {
                setIsUpdating(false);
            }
        };

        performUpdate();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>Edit Party: {party.name}</DialogTitle>
                    <DialogDescription>Make changes to the party details below.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Party Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="acronym" render={({ field }) => ( <FormItem><FormLabel>Acronym *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField control={form.control} name="leader" render={({ field }) => ( <FormItem><FormLabel>Party Leader *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="founded" render={({ field }) => ( <FormItem><FormLabel>Year Founded *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="color" render={({ field }) => ( <FormItem><FormLabel>Party Color</FormLabel><FormControl><Input type="color" {...field} className="h-10 p-1" /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="manifestoSummary" render={({ field }) => ( <FormItem><FormLabel>Manifesto Summary</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem>
                                <FormLabel>Party Logo</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setNewLogo)} />
                                </FormControl>
                                <FormDescription className="flex items-center gap-2">
                                    Upload a new logo to replace the current one.
                                    {party.logoUrl && <Link href={party.logoUrl} target="_blank" className="text-blue-500 text-xs hover:underline">(View Current)</Link>}
                                </FormDescription>
                            </FormItem>
                            <FormItem>
                                <FormLabel>Party Manifesto (PDF)</FormLabel>
                                <FormControl>
                                    <Input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, setNewManifesto)} />
                                </FormControl>
                                <FormDescription className="flex items-center gap-2">
                                    Upload a new manifesto to replace the current one.
                                    {party.manifestoUrl && <Link href={party.manifestoUrl} target="_blank" className="text-blue-500 text-xs hover:underline">(View Current)</Link>}
                                </FormDescription>
                            </FormItem>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isUpdating} className="bg-accent text-accent-foreground hover:bg-accent/90">
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
    

    
