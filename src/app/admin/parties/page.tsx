'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useStorage } from '@/firebase';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Party } from '@/lib/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const partySchema = z.object({
  name: z.string().min(1, 'Party name is required.'),
  acronym: z.string().min(1, 'Acronym is required.'),
  leader: z.string().min(1, 'Party leader is required.'),
  founded: z.coerce.number().min(1900, 'Invalid year.').max(new Date().getFullYear() + 1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Please enter a valid hex color.'),
  description: z.string().optional(),
  manifestoSummary: z.string().optional(),
  logo: z.any().optional(),
  manifesto: z.any().optional(),
});

type PartyFormValues = z.infer<typeof partySchema>;

export default function AdminPartiesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
  });

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const onSubmit: SubmitHandler<PartyFormValues> = async (data) => {
    setIsLoading(true);

    try {
      let logoUrl = '';
      if (data.logo && data.logo.length > 0) {
        logoUrl = await uploadFile(data.logo[0], `party-logos/${data.acronym.toLowerCase()}-logo`);
      }

      let manifestoUrl = '';
      if (data.manifesto && data.manifesto.length > 0) {
        manifestoUrl = await uploadFile(data.manifesto[0], `party-manifestos/${data.acronym.toLowerCase()}-manifesto.pdf`);
      }

      const partyData: Omit<Party, 'id'> = {
        name: data.name,
        acronym: data.acronym,
        leader: data.leader,
        founded: data.founded,
        color: data.color,
        description: data.description,
        manifestoSummary: data.manifestoSummary,
        logo: logoUrl,
        manifestoUrl: manifestoUrl,
      };

      const collectionRef = collection(firestore, 'parties');
      const docRef = await addDoc(collectionRef, partyData);
      
      toast({
        title: 'Party Saved!',
        description: `${data.name} has been added to the database.`,
      });
      reset();

    } catch (error: any) {
        const permissionError = new FirestorePermissionError({
            path: 'parties',
            operation: 'create',
            requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Parties"
        description="Add or edit political party information."
      />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Add New Party</CardTitle>
            <CardDescription>Fill out the form to add a new party.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Party Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="acronym">Acronym</Label>
                <Input id="acronym" {...register('acronym')} />
                 {errors.acronym && <p className="text-sm text-destructive">{errors.acronym.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leader">Party Leader</Label>
              <Input id="leader" {...register('leader')} />
              {errors.leader && <p className="text-sm text-destructive">{errors.leader.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="founded">Year Founded</Label>
                <Input id="founded" type="number" {...register('founded')} />
                {errors.founded && <p className="text-sm text-destructive">{errors.founded.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Party Color</Label>
                <Input id="color" type="color" {...register('color')} className="h-10" />
                {errors.color && <p className="text-sm text-destructive">{errors.color.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} placeholder="A brief description of the party's history and ideology..."/>
            </div>

             <div className="space-y-2">
                <Label htmlFor="manifestoSummary">Manifesto Summary</Label>
                <Textarea id="manifestoSummary" {...register('manifestoSummary')} placeholder="A short summary of the key points in the party's manifesto..."/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="logo">Party Logo</Label>
                <Input id="logo" type="file" {...register('logo')} accept="image/*" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manifesto">Party Manifesto (PDF)</Label>
                <Input id="manifesto" type="file" {...register('manifesto')} accept=".pdf" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Party'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
