'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2 } from 'lucide-react';
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
} from "@/components/ui/form"


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
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof partySchema>>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      acronym: '',
      leader: '',
      founded: undefined,
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
  
  const onSubmit = async (values: z.infer<typeof partySchema>) => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
        return;
    }
    
    setIsLoading(true);

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
        setIsLoading(false);
        return;
    }

    const partyData = {
        ...values,
        logoUrl,
        manifestoUrl,
    };
    
    const partiesCollection = collection(firestore, 'parties');
    addDocumentNonBlocking(partiesCollection, partyData);

    toast({ title: 'Success!', description: 'The new party has been saved.' });
    form.reset();
    setLogo(null);
    setManifesto(null);
    const logoInput = document.getElementById('logo') as HTMLInputElement;
    if (logoInput) logoInput.value = '';
    const manifestoInput = document.getElementById('manifesto') as HTMLInputElement;
    if (manifestoInput) manifestoInput.value = '';
    
    setIsLoading(false);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Parties"
        description="Add or edit political party information."
      />
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
                                    <Input {...field} />
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
                                    <Input {...field} />
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
                                <Input {...field} />
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
                                    <Input type="number" {...field} />
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
                                   <Input type="color" {...field} className="h-10 p-1" />
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
                                <Textarea placeholder="A brief description of the party's history and ideology..." {...field} />
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
                               <Textarea placeholder="A short summary of the key points in the party's manifesto..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="logo">Party Logo</Label>
                        <Input id="logo" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogo)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="manifesto">Party Manifesto (PDF)</Label>
                        <Input id="manifesto" type="file" accept=".pdf" onChange={(e) => handleFileChange(e, setManifesto)} />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isLoading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                    </>
                ) : (
                    'Save Party'
                )}
                </Button>
            </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
