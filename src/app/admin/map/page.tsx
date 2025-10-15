
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError, useCollection } from '@/firebase';
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { uploadFile } from '@/firebase/storage';
import type { Constituency } from '@/lib/types';
import Image from 'next/image';

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
            const fileExtension = mapImage.name.split('.').pop();
            const mapPath = `maps/st-lucia-constituencies.${fileExtension}`;

            const mapUrl = await uploadFile(mapImage, mapPath);
            
            const settingsDocRef = doc(firestore, 'settings', 'site');
            const newSettings = { mapUrl: mapUrl };

            setDoc(settingsDocRef, newSettings, { merge: true })
              .then(() => {
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
    <div className="container mx-auto px-4 py-8 space-y-8">
         <PageHeader
            title="Manage Electoral Map"
            description="Upload the constituency map and manage the overlay positions."
        />
        <div className="grid gap-8 md:grid-cols-2">
            <div>
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
            <Card>
                <CardHeader>
                    <CardTitle>Map Preview</CardTitle>
                    <CardDescription>This is the current map being displayed to users.</CardDescription>
                </CardHeader>
                <CardContent>
                    {(loadingSettings) && <div className="h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}
                    {!(loadingSettings) && mapPreviewUrl ? (
                        <div className="relative w-full h-[400px] border rounded-lg overflow-hidden p-2 flex items-center justify-center">
                            <Image src={mapPreviewUrl} alt="Constituency Map Preview" fill className="object-contain" />
                        </div>
                    ) : (
                        !loadingSettings && <p className="text-muted-foreground text-center py-10">No map has been uploaded yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <OverlayManager />
    </div>
  );
}


function OverlayManager() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
    
    const [coords, setCoords] = useState<Record<string, { top: string, left: string }>>({});
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (constituencies) {
            const initialCoords = constituencies.reduce((acc, c) => {
                acc[c.id] = c.mapCoordinates || { top: '50', left: '50' };
                return acc;
            }, {} as Record<string, {top: string, left: string}>);
            setCoords(initialCoords);
        }
    }, [constituencies]);

    const handleCoordChange = (id: string, field: 'top' | 'left', value: string) => {
        setCoords(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleSaveCoords = (constituency: Constituency) => {
        if (!firestore) return;
        
        setIsSaving(prev => ({ ...prev, [constituency.id]: true }));

        const newCoords = coords[constituency.id];
        const constituencyRef = doc(firestore, 'constituencies', constituency.id);
        
        updateDoc(constituencyRef, { mapCoordinates: newCoords })
            .then(() => {
                toast({ title: 'Saved!', description: `Coordinates for ${constituency.name} have been updated.` });
            })
            .catch((error) => {
                 const contextualError = new FirestorePermissionError({
                    path: constituencyRef.path,
                    operation: 'update',
                    requestResourceData: { mapCoordinates: newCoords }
                });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => {
                setIsSaving(prev => ({ ...prev, [constituency.id]: false }));
            });
    };

    if (loadingConstituencies) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Overlays</CardTitle>
                <CardDescription>Set the position of each constituency's interactive point on the map. Values are percentages (%).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {constituencies?.map(c => (
                        <div key={c.id} className="p-3 border rounded-md bg-muted/20">
                            <h4 className="font-semibold mb-2">{c.name}</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor={`top-${c.id}`} className="text-xs">Top (%)</Label>
                                    <Input 
                                        id={`top-${c.id}`} 
                                        type="number" 
                                        value={coords[c.id]?.top || ''}
                                        onChange={e => handleCoordChange(c.id, 'top', e.target.value)}
                                        className="h-8"
                                        disabled={isSaving[c.id]}
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor={`left-${c.id}`} className="text-xs">Left (%)</Label>
                                    <Input 
                                        id={`left-${c.id}`} 
                                        type="number"
                                        value={coords[c.id]?.left || ''}
                                        onChange={e => handleCoordChange(c.id, 'left', e.target.value)}
                                        className="h-8"
                                        disabled={isSaving[c.id]}
                                    />
                                </div>
                                <div className="self-end">
                                    <Button size="icon" className="h-8 w-8" onClick={() => handleSaveCoords(c)} disabled={isSaving[c.id]}>
                                        {isSaving[c.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

