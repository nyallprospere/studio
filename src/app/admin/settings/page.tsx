

'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirebase, errorEmitter, FirestorePermissionError, useDoc, useMemoFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2, Database, UploadCloud } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { uploadFile, deleteFile } from '@/firebase/storage';
import type { SiteSettings } from '@/lib/types';
import Image from 'next/image';

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
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
    const { data: siteSettings, isLoading: loadingSettings } = useDoc<SiteSettings>(settingsRef);
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (siteSettings) {
          setCurrentLogoUrl(siteSettings.siteLogoUrl);
        }
    }, [siteSettings]);

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
                setIsLoading(false);
                return;
            }
            
            const batch = writeBatch(firestore);
            
            electionYearsToSeed.forEach(election => {
                const docRef = doc(electionsCollection);
                batch.set(docRef, { ...election, isCurrent: false });
            });
            
            await batch.commit()
              .then(() => {
                toast({
                    title: 'Seeding Successful',
                    description: 'Election years have been added to the database.'
                });
              })
              .catch(error => {
                const contextualError = new FirestorePermissionError({
                    path: electionsCollection.path,
                    operation: 'write',
                    requestResourceData: electionYearsToSeed,
                });
                errorEmitter.emit('permission-error', contextualError);
              });

        } catch (error) {
            console.error('Error checking for existing elections:', error);
            toast({
                variant: 'destructive',
                title: 'Seeding Failed',
                description: 'An error occurred while preparing to seed election data. See the console for details.'
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!logoFile || !firestore || !settingsRef) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a file to upload.' });
            return;
        }
        
        setIsUploading(true);
        try {
            if (currentLogoUrl) {
                try {
                    await deleteFile(currentLogoUrl);
                } catch (e) {
                    console.warn("Could not delete old logo, it may have already been removed.", e)
                }
            }
          
            const newLogoUrl = await uploadFile(logoFile, `logos/site_logo_${Date.now()}`);
          
            await setDoc(settingsRef, { siteLogoUrl: newLogoUrl }, { merge: true });
          
            setCurrentLogoUrl(newLogoUrl);
            setLogoFile(null);
            toast({ title: 'Success', description: 'Site logo has been updated.' });
        } catch (error) {
            console.error('Logo upload error:', error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the logo.' });
        } finally {
            setIsUploading(false);
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
                    <Database className="w-5 h-5" /> Site Logo
                </CardTitle>
                <CardDescription>Upload or change the main logo for the website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {loadingSettings ? (
                    <p>Loading logo...</p>
                 ) : currentLogoUrl ? (
                    <div className="relative h-24 border rounded-md p-2">
                        <Image src={currentLogoUrl} alt="Current Site Logo" fill className="object-contain" />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-md">
                        <p className="text-muted-foreground">No logo uploaded</p>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Input id="logo-upload" type="file" onChange={handleFileChange} className="flex-1" />
                    <Button onClick={handleUpload} disabled={!logoFile || isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Upload
                    </Button>
                </div>
            </CardContent>
        </Card>
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
      </div>
    </div>
  );
}
