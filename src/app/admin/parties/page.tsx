'use client';

import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useStorage } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Party } from '@/lib/types';
import { Trash2, Edit, Loader2 } from 'lucide-react';
import { useState } from 'react';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const fileSchema = z.instanceof(File).optional().nullable();

const partySchema = z.object({
  name: z.string().min(2, 'Party name is required'),
  acronym: z.string().min(2, 'Acronym is required'),
  leader: z.string().min(2, 'Leader name is required'),
  founded: z.coerce.number().min(1900, 'Invalid year'),
  description: z.string().optional(),
  manifestoSummary: z.string().optional(),
  logo: fileSchema,
  manifesto: fileSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format'),
});

type PartyFormValues = z.infer<typeof partySchema>;

export default function AdminPartiesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const [isLoading, setIsLoading] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const { data: parties, loading: loadingParties } = useCollection<Party>('parties');

  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      acronym: '',
      leader: '',
      founded: new Date().getFullYear(),
      description: '',
      manifestoSummary: '',
      color: '#000000',
      logo: null,
      manifesto: null,
    },
  });
  
  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  const onSubmit = async (values: PartyFormValues) => {
    if (!firestore) return;
    setIsLoading(true);
    
    try {
        let logoUrl = editingParty?.logo;
        if (values.logo) {
            logoUrl = await uploadFile(values.logo, `party_logos/${values.acronym}_${Date.now()}`);
        }

        let manifestoUrl = editingParty?.manifestoUrl;
        if (values.manifesto) {
            manifestoUrl = await uploadFile(values.manifesto, `party_manifestos/${values.acronym}_${Date.now()}.pdf`);
        }

        const partyData = {
            name: values.name,
            acronym: values.acronym,
            leader: values.leader,
            founded: values.founded,
            description: values.description || "",
            manifestoSummary: values.manifestoSummary || "",
            color: values.color,
            logo: logoUrl || "",
            manifestoUrl: manifestoUrl || "",
        };

        if (editingParty) {
            const partyRef = doc(firestore, 'parties', editingParty.id);
            updateDoc(partyRef, partyData)
                .then(() => {
                    toast({ title: 'Party Updated', description: `${values.name} has been successfully updated.` });
                    form.reset({ name: '', acronym: '', leader: '', founded: new Date().getFullYear(), description: '', manifestoSummary: '', color: '#000000', logo: null, manifesto: null });
                    setEditingParty(null);
                })
                .catch(async (error) => {
                    const permissionError = new FirestorePermissionError({ path: partyRef.path, operation: 'update', requestResourceData: partyData });
                    errorEmitter.emit('permission-error', permissionError);
                });
        } else {
            const collectionRef = collection(firestore, 'parties');
            addDoc(collectionRef, partyData)
                .then(() => {
                    toast({ title: 'Party Added', description: `${values.name} has been successfully added.` });
                    form.reset({ name: '', acronym: '', leader: '', founded: new Date().getFullYear(), description: '', manifestoSummary: '', color: '#000000', logo: null, manifesto: null });
                })
                .catch(async (error) => {
                    const permissionError = new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: partyData });
                    errorEmitter.emit('permission-error', permissionError);
                });
        }
    } catch (e) {
        // This will catch errors from file upload, etc.
        console.error("An unexpected error occurred:", e);
        toast({
            variant: "destructive",
            title: "Upload Error",
            description: "An error occurred while uploading a file. Please check storage rules.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    form.reset({
      name: party.name,
      acronym: party.acronym,
      leader: party.leader,
      founded: party.founded,
      description: party.description || '',
      manifestoSummary: party.manifestoSummary || '',
      color: party.color,
    });
  };

  const handleDelete = async (partyId: string) => {
    if (!firestore) return;
    const partyRef = doc(firestore, "parties", partyId);
    deleteDoc(partyRef)
        .then(() => {
            toast({ title: "Party Deleted", description: "The party has been successfully deleted." });
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({ path: partyRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <PageHeader
        title="Manage Parties"
        description="Add or edit political party information."
      />
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</CardTitle>
              <CardDescription>
                Fill out the form to {editingParty ? 'update the' : 'add a new'} party.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., United Workers Party" {...field} />
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
                        <FormLabel>Acronym</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., UWP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leader"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party Leader</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Allen Chastanet" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="founded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Founded</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 1964" {...field} />
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
                        <FormLabel>Party Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="A brief description of the party's history and core values." {...field} />
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
                          <Textarea placeholder="A short summary of the party's manifesto." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="logo"
                        render={({ field: { onChange, value, ...rest }}) => (
                        <FormItem>
                            <FormLabel>Party Logo</FormLabel>
                            <FormControl>
                            <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="manifesto"
                        render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                            <FormLabel>Party Manifesto (PDF)</FormLabel>
                            <FormControl>
                            <Input type="file" accept=".pdf" onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                
                <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button type="submit" disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {isLoading ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                        </>
                    ) : (
                        editingParty ? 'Update Party' : 'Save Party'
                    )}
                </Button>
                {editingParty && (
                    <Button variant="outline" onClick={() => { setEditingParty(null); form.reset({
                      name: '', acronym: '', leader: '', founded: new Date().getFullYear(), description: '', manifestoSummary: '', color: '#000000', logo: null, manifesto: null
                    }); }}>
                        Cancel Edit
                    </Button>
                )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Parties</CardTitle>
          <CardDescription>View, edit, or delete existing political parties.</CardDescription>
        </CardHeader>
        <CardContent>
            {loadingParties ? (
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-4">
                    {parties?.map((party) => (
                        <div key={party.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full flex-shrink-0" style={{ backgroundColor: party.color }}>
                                    {party.logo && <img src={party.logo} alt={party.name} className="h-full w-full object-cover rounded-full" />}
                                </div>
                                <div>
                                    <p className="font-semibold">{party.name} ({party.acronym})</p>
                                    <p className="text-sm text-muted-foreground">{party.leader}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(party)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the party
                                            and all associated data.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(party.id)} className="bg-destructive hover:bg-destructive/90">
                                            Delete
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
