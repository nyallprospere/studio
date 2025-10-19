
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Database } from 'lucide-react';

const electionYearsToSeed = [
  { year: 2021, name: '2021 General Election' },
  { year: 2016, name: '2016 General Election' },
  { year: 2011, name: '2011 General Election' },
  { year: 2006, name: '2006 General Election' },
  { year: 2001, name: '2001 General Election' },
  { year: 1997, name: '1997 General Election' },
  { year: 1992, name: '1992 General Election' },
  { year: 1987, name: '1987 General Election (April 30)' },
  { year: 1987, name: '1987 General Election (April 6)' },
  { year: 1982, name: '1982 General Election' },
  { year: 1979, name: '1979 General Election' },
];

export default function SettingsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSeedElections = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
            return;
        }

        setIsLoading(true);

        try {
            const electionsCollection = collection(firestore, 'elections');
            const existingElectionsSnap = await getDocs(electionsCollection);
            
            if (!existingElectionsSnap.empty) {
                toast({
                    title: 'Seeding Skipped',
                    description: 'Elections data already exists. Seeding was skipped to prevent duplicates.',
                    variant: 'default'
                });
                return;
            }
            
            const batch = writeBatch(firestore);
            
            electionYearsToSeed.forEach(election => {
                const docRef = doc(electionsCollection);
                batch.set(docRef, { ...election, isCurrent: false });
            });
            
            await batch.commit();

            toast({
                title: 'Seeding Successful',
                description: 'Election years have been added to the database.'
            });

        } catch (error) {
            console.error('Error seeding elections:', error);
            toast({
                variant: 'destructive',
                title: 'Seeding Failed',
                description: 'An error occurred while seeding election data. See the console for details.'
            });
        } finally {
            setIsLoading(false);
        }
    };


  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Settings"
        description="Update site-wide settings and configurations."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" /> Data Seeding
            </CardTitle>
            <CardDescription>
                Pre-populate your database with initial data. This is useful for first-time setup.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Button onClick={handleSeedElections} disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Seeding...
                    </>
                ) : 'Seed Election Years'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
                Adds election years from 1979-2021. This operation will only run if no elections exist.
            </p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle>Site Settings</CardTitle>
            <CardDescription>
                More options will be available here in the future.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <p className="text-muted-foreground">Settings management interface is under construction.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
