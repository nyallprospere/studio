'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase, useCollection, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { uploadFile } from '@/firebase/storage';
import type { Constituency } from '@/lib/types';

export default function AdminConstituenciesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [population, setPopulation] = useState('');
    const [voters, setVoters] = useState('');
    const [locations, setLocations] = useState('');
    const [mapImage, setMapImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
    const { data: siteSettings, isLoading: loadingSettings } = useDoc(settingsRef);

    useEffect(() => {
        if (siteSettings && siteSettings.mapUrl) {
            // Add a timestamp to bust the cache every time the component loads
            setMapPreviewUrl(`${siteSettings.mapUrl}?t=${new Date().getTime()}`);
        }
    }, [siteSettings]);


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
    
    const handleMapUpload = async () => {
        if (!mapImage || !firestore) {
             toast({ variant: 'destructive', title: 'Error', description: 'Please select a file to upload.' });
            return;
        }
        setIsLoading(true);
        try {
            // Use a consistent name for the map file to overwrite it
            const fileExtension = mapImage.name.split('.').pop();
            const mapPath = `maps/st-lucia-constituencies.${fileExtension}`;

            const mapUrl = await uploadFile(mapImage, mapPath);
            
            const settingsDocRef = doc(firestore, 'settings', 'site');
            const newSettings = { mapUrl: mapUrl };

            setDoc(settingsDocRef, newSettings, { merge: true })
              .then(() => {
                // We use a timestamped URL for the immediate preview to bust the cache
                setMapPreviewUrl(`${mapUrl}?t=${new Date().getTime()}`);
                toast({ title: 'Map Uploaded', description: 'The constituency map has been updated.' });
              })
              .catch((serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: settingsDocRef.path,
                    operation: 'update',
                    requestResourceData: newSettings
                });
                errorEmitter.emit('permission-error', permissionError);
              });

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload map.' });
        } finally {
            setIsLoading(false);
            setMapImage(null);
            const fileInput = document.getElementById('map-svg') as HTMLInputElement;
            if(fileInput) fileInput.value = '';
        }
    }

  return (
    <div className="container mx-auto px-4 py-8">
         <PageHeader
            title="Manage Constituencies"
            description="Add new constituencies and manage the electoral map."
        />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-8">
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

                <Card>
                    <CardHeader>
                        <CardTitle>Upload Constituency Map</CardTitle>
                        <CardDescription>Upload an SVG, PNG, or JPG file to be used as the constituency map.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="map-svg">Constituency Map File</Label>
                            <Input id="map-svg" type="file" accept="image/svg+xml,image/png,image/jpeg" onChange={e => e.target.files && setMapImage(e.target.files[0])} disabled={isLoading} />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleMapUpload} disabled={isLoading || !mapImage}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Upload Map
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Map Preview</CardTitle>
                        <CardDescription>This is the current map being displayed to users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(loadingConstituencies || loadingSettings) && <p>Loading map...</p>}
                        {!(loadingConstituencies || loadingSettings) && mapPreviewUrl ? (
                            <div className="relative w-full h-[600px] border rounded-lg overflow-hidden p-2 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={mapPreviewUrl} alt="Constituency Map Preview" className="max-w-full max-h-full object-contain" />
                            </div>
                        ) : (
                            !loadingConstituencies && !loadingSettings && <p className="text-muted-foreground text-center py-10">No map has been uploaded yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
