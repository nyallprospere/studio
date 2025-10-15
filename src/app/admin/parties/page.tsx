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
import { addDoc, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2 } from 'lucide-react';

export default function AdminPartiesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('');
  const [leader, setLeader] = useState('');
  const [founded, setFounded] = useState<number | ''>('');
  const [color, setColor] = useState('#000000');
  const [description, setDescription] = useState('');
  const [manifestoSummary, setManifestoSummary] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [manifesto, setManifesto] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);

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

  const resetForm = () => {
    setName('');
    setAcronym('');
    setLeader('');
    setFounded('');
    setColor('#000000');
    setDescription('');
    setManifestoSummary('');
    setLogo(null);
    setManifesto(null);
    // Reset file inputs
    const logoInput = document.getElementById('logo') as HTMLInputElement;
    if (logoInput) logoInput.value = '';
    const manifestoInput = document.getElementById('manifesto') as HTMLInputElement;
    if (manifestoInput) manifestoInput.value = '';
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
        return;
    }
    if (!name || !acronym || !leader || !founded) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all required fields.' });
        return;
    }
    
    setIsLoading(true);

    try {
        let logoUrl = '';
        if (logo) {
            logoUrl = await uploadFile(logo, `party-logos/${Date.now()}-${logo.name}`);
        }

        let manifestoUrl = '';
        if (manifesto) {
            manifestoUrl = await uploadFile(manifesto, `party-manifestos/${Date.now()}-${manifesto.name}`);
        }

        const partiesCollection = collection(firestore, 'parties');
        
        await addDoc(partiesCollection, {
            name,
            acronym,
            leader,
            founded,
            color,
            description,
            manifestoSummary,
            logoUrl,
            manifestoUrl,
        });

        toast({ title: 'Success!', description: 'The new party has been saved.' });
        resetForm();
    } catch (error) {
        console.error("Error saving party: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'An error occurred while saving the party.' });
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
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Add New Party</CardTitle>
            <CardDescription>Fill out the form to add a new party to the database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Party Name *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acronym">Acronym *</Label>
                <Input id="acronym" value={acronym} onChange={e => setAcronym(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leader">Party Leader *</Label>
              <Input id="leader" value={leader} onChange={e => setLeader(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="founded">Year Founded *</Label>
                <Input id="founded" type="number" value={founded} onChange={e => setFounded(e.target.value === '' ? '' : parseInt(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Party Color</Label>
                <Input id="color" type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10" />
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="A brief description of the party's history and ideology..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>

             <div className="space-y-2">
                <Label htmlFor="manifestoSummary">Manifesto Summary</Label>
                <Textarea id="manifestoSummary" placeholder="A short summary of the key points in the party's manifesto..." value={manifestoSummary} onChange={e => setManifestoSummary(e.target.value)} />
            </div>

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
      </Card>
    </div>
  );
}
