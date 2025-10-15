'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { uploadFile } from '@/firebase/storage';

export default function AdminMapPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [mapImage, setMapImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
    const { data: siteSettings, isLoading: loadingSettings } = useDoc(settingsRef);

    useEffect(() => {
        if (siteSettings && siteSettings.mapUrl) {
            // Add a timestamp to bust the cache every time the component loads
            setMapPreviewUrl(`${siteSettings.mapUrl}?t=${new Date().getTime()}`);
        }
    }, [siteSettings]);
    
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
            title="Manage Electoral Map"
            description="Upload and preview the constituency map for the election."
        />
        <div className="grid gap-8 md:grid-cols-2">
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
            <Card>
                <CardHeader>
                    <CardTitle>Map Preview</CardTitle>
                    <CardDescription>This is the current map being displayed to users.</CardDescription>
                </CardHeader>
                <CardContent>
                    {(loadingSettings) && <p>Loading map...</p>}
                    {!(loadingSettings) && mapPreviewUrl ? (
                        <div className="relative w-full h-[400px] border rounded-lg overflow-hidden p-2 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mapPreviewUrl} alt="Constituency Map Preview" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        !loadingSettings && <p className="text-muted-foreground text-center py-10">No map has been uploaded yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
