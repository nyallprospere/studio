'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Trash2, Upload, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as XLSX from 'xlsx';
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
    registeredVoters: z.coerce.number().positive('Voters must be a positive number.'),
});

export default function AdminConstituenciesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies, error } = useCollection<Constituency>(constituenciesQuery);

    const form = useForm<z.infer<typeof constituencySchema>>({
        resolver: zodResolver(constituencySchema),
        defaultValues: {
            name: '',
            registeredVoters: '' as any,
        },
    });

    const onSubmit = async (values: z.infer<typeof constituencySchema>) => {
        if (!firestore) return;
        setIsSubmitting(true);
        
        const newConstituency = {
            name: values.name,
            demographics: {
                registeredVoters: values.registeredVoters,
            },
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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !firestore) {
            toast({ variant: 'destructive', title: 'Import Failed', description: 'No file selected or Firestore not available.'});
            return;
        };
        setIsImporting(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
                
                const batch = writeBatch(firestore);
                let recordsToProcess: any[] = [];

                jsonData.forEach(row => {
                    if (row['Name'] && row['Registered Voters']) {
                       const constituencyData = {
                            name: row['Name'],
                            demographics: {
                                registeredVoters: Number(row['Registered Voters']),
                            },
                       };
                       const constituencyRef = doc(collection(firestore, 'constituencies'));
                       batch.set(constituencyRef, constituencyData);
                       recordsToProcess.push(constituencyData);
                    }
                });

                if (recordsToProcess.length > 0) {
                    await batch.commit();
                    toast({
                        title: 'Import Successful',
                        description: `Successfully imported and saved ${recordsToProcess.length} constituencies.`,
                    });
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'Import Failed',
                        description: 'No valid records found. Check column names: Name, Registered Voters.',
                    });
                }
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Import Error', description: error.message || 'Could not parse or save the data.' });
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExport = () => {
        if (!constituencies) {
            toast({ variant: 'destructive', title: 'Export Failed', description: 'No constituencies to export.' });
            return;
        }
        setIsExporting(true);
        try {
            const dataToExport = constituencies.map(c => ({
                'Name': c.name,
                'Registered Voters': c.demographics.registeredVoters,
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Constituencies");
            XLSX.writeFile(workbook, "Constituency_List.xlsx");
            toast({ title: 'Export Successful' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: error.message || 'An error occurred.' });
        } finally {
            setIsExporting(false);
        }
    };
    
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
         <PageHeader
            title="Manage Constituencies"
            description="Add, edit, or delete constituencies from the electoral list."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                        <FormField control={form.control} name="registeredVoters" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Registered Voters *</FormLabel>
                                <FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl>
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
            <Card>
                <CardHeader>
                    <CardTitle>Bulk Data Management</CardTitle>
                    <CardDescription>Import or export all constituencies using a CSV or Excel file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    />
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="w-full">
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Import from File
                        </Button>
                        <Button onClick={handleExport} variant="outline" disabled={isExporting || loadingConstituencies} className="w-full">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export to Excel
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        For imports, ensure your file has columns: 'Name' and 'Registered Voters'.
                    </p>
                </CardContent>
            </Card>
        </div>
        
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
                            <TableHead>Registered Voters</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {constituencies && constituencies.length > 0 ? constituencies.map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
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
                                <TableCell colSpan={3} className="text-center">No constituencies found.</TableCell>
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
            registeredVoters: constituency.demographics.registeredVoters,
        },
    });

    useEffect(() => {
        if (open) {
             form.reset({
                name: constituency.name,
                registeredVoters: constituency.demographics.registeredVoters,
            });
        }
    }, [open, constituency, form]);

    const onUpdate = async (values: z.infer<typeof constituencySchema>) => {
        if (!firestore) return;

        setIsUpdating(true);
        const updatedData = {
            name: values.name,
            demographics: {
                registeredVoters: values.registeredVoters,
            },
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
                        <FormField control={form.control} name="registeredVoters" render={({ field }) => ( <FormItem><FormLabel>Registered Voters *</FormLabel><FormControl><Input type="number" {...field} disabled={isUpdating} /></FormControl><FormMessage /></FormItem> )} />

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
