'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2 } from 'lucide-react';
import { collection } from 'firebase/firestore';
import type { Party, Constituency } from '@/lib/types';


export default function AdminCandidatesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

  const [name, setName] = useState('');
  const [partyId, setPartyId] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageUrl(e.target.files[0]);
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
    setPartyId('');
    setConstituencyId('');
    setBio('');
    setImageUrl(null);
    const imageInput = document.getElementById('candidate-photo') as HTMLInputElement;
    if (imageInput) imageInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
        return;
    }
    if (!name || !partyId || !constituencyId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all required fields.' });
        return;
    }
    
    setIsLoading(true);

    try {
        let uploadedImageUrl = '';
        if (imageUrl) {
            uploadedImageUrl = await uploadFile(imageUrl, `candidate-photos/${Date.now()}-${imageUrl.name}`);
        }

        const candidatesCollection = collection(firestore, 'candidates');
        
        const candidateData = {
            name,
            partyId,
            constituencyId,
            bio,
            imageUrl: uploadedImageUrl,
            policyPositions: [], // Default to empty array
        };
        
        addDocumentNonBlocking(candidatesCollection, candidateData);

        toast({ title: 'Success!', description: 'The new candidate has been saved.' });
        resetForm();
    } catch (error: any) {
        console.error("Error saving candidate: ", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'An error occurred while saving the candidate.' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Candidates"
        description="Add or edit candidate profiles."
      />
      <Card>
        <form onSubmit={handleSubmit}>
            <CardHeader>
            <CardTitle>Add New Candidate</CardTitle>
            <CardDescription>Fill out the form to add a new candidate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="candidate-name">Candidate Name *</Label>
                    <Input id="candidate-name" placeholder="e.g., Jane Doe" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="candidate-party">Party *</Label>
                    <Select value={partyId} onValueChange={setPartyId} required>
                        <SelectTrigger id="candidate-party">
                            <SelectValue placeholder="Select a party" />
                        </SelectTrigger>
                        <SelectContent>
                            {loadingParties ? <SelectItem value="loading" disabled>Loading...</SelectItem> : parties?.map(party => (
                                <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="candidate-constituency">Constituency *</Label>
                    <Select value={constituencyId} onValueChange={setConstituencyId} required>
                        <SelectTrigger id="candidate-constituency">
                            <SelectValue placeholder="Select a constituency" />
                        </SelectTrigger>
                        <SelectContent>
                            {loadingConstituencies ? <SelectItem value="loading" disabled>Loading...</SelectItem> : constituencies?.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="candidate-bio">Biography</Label>
                    <Textarea id="candidate-bio" placeholder="A brief bio of the candidate..." value={bio} onChange={e => setBio(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="candidate-photo">Candidate Photo</Label>
                    <Input id="candidate-photo" type="file" accept="image/*" onChange={handleFileChange} />
                </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit" disabled={isLoading || loadingParties || loadingConstituencies} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isLoading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                    </>
                ) : (
                    'Save Candidate'
                )}
                </Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
