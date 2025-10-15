'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import type { Constituency } from '@/lib/types';


const constituencySchema = z.object({
    name: z.string().min(3, 'Constituency name must be at least 3 characters.'),
    population: z.coerce.number().positive('Population must be a positive number.'),
    registeredVoters: z.coerce.number().positive('Voters must be a positive number.'),
    pollingLocations: z.string().optional(),
});

export default function AdminConstituenciesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const form = useForm<z.infer<typeof constituencySchema>>({
        resolver: zodResolver(constituencySchema),
        defaultValues: {
            name: '',
            population: '' as any,
            registeredVoters: '' as any,
            pollingLocations: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof constituencySchema>) => {
        if (!firestore) return;
        setIsSubmitting(true);
        
        const newConstituency = {
            name: values.name,
            demographics: {
                population: values.population,
                registeredVoters: values.registeredVoters,
            },
            pollingLocations: values.pollingLocations?.split('\n').filter(l => l.trim() !== '') || [],
        };
        
        const constituenciesCollection = collection(firestore, 'constituencies');
        addDoc(constituenciesCollection, newConstituency)
            .then(() => {
                toast({ title: 'Success!', description: `${values.name} has been added.` });
                form.reset();
            })
            .catch((error: any) => {
                const contextualError = new FirestorePermissionError({
                  path: 'constituencies',
                  operation: 'create',
                  requestResourceData: newConstituency,
                });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };
    
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
         <PageHeader
            title="Manage Constituencies"
            description="Add, edit, or delete constituencies from the electoral list."
        />
        <Card>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                    <CardTitle>Add New Constituency</CardTitle>
                    <CardDescription>Fill out the form to add a new constituency.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Constituency Name *</FormLabel>
                            <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="population" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Population *</FormLabel>
                                <FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="registeredVoters" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Registered Voters *</FormLabel>
                                <FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="pollingLocations" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Polling Locations</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Enter one location per line..." {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormDescription>Each line will be saved as a separate location.</FormDescription>
                            <FormMessage />
                        </FormItem>
                     )} />
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90"  disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Constituency'}
                    </Button>
                </CardFooter>
            </form>
            </Form>
        </Card>
        
        <ConstituencyList constituencies={constituencies} isLoading={loadingConstituencies} />
    </div>
  );
}


function ConstituencyList({ constituencies, isLoading }: { constituencies: Constituency[] | null, isLoading: boolean }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const handleDelete = async (constituency: Constituency) => {
        if (!firestore) return;

        toast({ title: 'Deletion processing...', description: `Removing ${constituency.name}.` });
        const constituencyRef = doc(firestore, 'constituencies', constituency.id);
        
        deleteDoc(constituencyRef)
            .then(() => {
                toast({ title: 'Success!', description: `${constituency.name} has been deleted.` });
            })
            .catch((error) => {
                const contextualError = new FirestorePermissionError({
                    path: constituencyRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', contextualError);
            });
    };
    
    if (isLoading) {
        return <div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Constituencies</CardTitle>
                <CardDescription>View, edit, or delete existing constituencies.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Population</TableHead>
                            <TableHead>Registered Voters</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {constituencies && constituencies.length > 0 ? constituencies.map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell>{c.demographics.population.toLocaleString()}</TableCell>
                                <TableCell>{c.demographics.registeredVoters.toLocaleString()}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <EditConstituencyDialog constituency={c} />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete the "{c.name}" constituency.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(c)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">No constituencies found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function EditConstituencyDialog({ constituency }: { constituency: Constituency }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const form = useForm<z.infer<typeof constituencySchema>>({
        resolver: zodResolver(constituencySchema),
        defaultValues: {
            name: constituency.name,
            population: constituency.demographics.population,
            registeredVoters: constituency.demographics.registeredVoters,
            pollingLocations: constituency.pollingLocations.join('\n'),
        },
    });

    useEffect(() => {
        if (open) {
             form.reset({
                name: constituency.name,
                population: constituency.demographics.population,
                registeredVoters: constituency.demographics.registeredVoters,
                pollingLocations: constituency.pollingLocations.join('\n'),
            });
        }
    }, [open, constituency, form]);

    const onUpdate = async (values: z.infer<typeof constituencySchema>) => {
        if (!firestore) return;

        setIsUpdating(true);
        const updatedData = {
            name: values.name,
            demographics: {
                population: values.population,
                registeredVoters: values.registeredVoters,
            },
            pollingLocations: values.pollingLocations?.split('\n').filter(l => l.trim() !== '') || [],
        };
        
        const constituencyRef = doc(firestore, 'constituencies', constituency.id);
        updateDoc(constituencyRef, updatedData)
            .then(() => {
                toast({ title: "Update Successful", description: `${constituency.name} has been updated.` });
                setOpen(false);
            })
            .catch((error) => {
                 const contextualError = new FirestorePermissionError({
                    path: constituencyRef.path,
                    operation: 'update',
                    requestResourceData: updatedData
                });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => {
                setIsUpdating(false);
            });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
                 <DialogHeader>
                    <DialogTitle>Edit Constituency: {constituency.name}</DialogTitle>
                    <DialogDescription>Make changes to the constituency details below.</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Constituency Name *</FormLabel><FormControl><Input {...field} disabled={isUpdating} /></FormControl><FormMessage /></FormItem> )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="population" render={({ field }) => ( <FormItem><FormLabel>Population *</FormLabel><FormControl><Input type="number" {...field} disabled={isUpdating} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="registeredVoters" render={({ field }) => ( <FormItem><FormLabel>Registered Voters *</FormLabel><FormControl><Input type="number" {...field} disabled={isUpdating} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField control={form.control} name="pollingLocations" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Polling Locations</FormLabel>
                                <FormControl><Textarea placeholder="Enter one location per line..." {...field} disabled={isUpdating} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary" disabled={isUpdating}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isUpdating} className="bg-accent text-accent-foreground hover:bg-accent/90">
                                {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
