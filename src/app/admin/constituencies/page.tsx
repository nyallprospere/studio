'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AdminConstituenciesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [population, setPopulation] = useState('');
    const [voters, setVoters] = useState('');
    const [locations, setLocations] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddConstituency = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !name || !population || !voters) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields.' });
            return;
        }
        setIsLoading(true);

        const newConstituency = {
            name,
            demographics: {
                population: Number(population),
                registeredVoters: Number(voters),
            },
            pollingLocations: locations.split('\n').filter(l => l.trim() !== ''),
        };

        try {
            await addDoc(collection(firestore, 'constituencies'), newConstituency);
            toast({ title: 'Success!', description: `${name} has been added.` });
            setName('');
            setPopulation('');
            setVoters('');
            setLocations('');
        } catch (error: any) {
            const contextualError = new FirestorePermissionError({
              path: 'constituencies',
              operation: 'create',
              requestResourceData: newConstituency,
            });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsLoading(false);
        }
    };
    
  return (
    <div className="container mx-auto px-4 py-8">
         <PageHeader
            title="Manage Constituencies"
            description="Add new constituencies to the electoral list."
        />
        <Card>
            <form onSubmit={handleAddConstituency}>
                <CardHeader>
                <CardTitle>Add New Constituency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="constituency-name">Constituency Name</Label>
                        <Input id="constituency-name" placeholder="e.g., Gros Islet" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="constituency-population">Population</Label>
                        <Input id="constituency-population" type="number" placeholder="25000" value={population} onChange={e => setPopulation(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="constituency-voters">Registered Voters</Label>
                        <Input id="constituency-voters" type="number" placeholder="21000" value={voters} onChange={e => setVoters(e.target.value)} disabled={isLoading} />
                    </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="constituency-locations">Polling Locations</Label>
                        <Textarea id="constituency-locations" placeholder="Enter one location per line..." value={locations} onChange={e => setLocations(e.target.value)} disabled={isLoading}/>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90"  disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Constituency
                    </Button>
                </CardFooter>
            </form>
        </Card>
    </div>
  );
}
