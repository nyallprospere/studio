
'use client';

import { useState, useEffect, useRef } from 'react';
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
        
        <Card>
            <CardHeader>
                <CardTitle>Upload Constituency Map</CardTitle>
                <CardDescription>Upload an SVG, PNG, or JPG file to be used as the constituency map. This will replace the current map.</CardDescription>
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
        
        <OverlayManager mapUrl={mapPreviewUrl} loadingMap={loadingSettings} />
    </div>
  );
}


function OverlayManager({ mapUrl, loadingMap }: { mapUrl: string | null; loadingMap: boolean; }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
    
    const [coords, setCoords] = useState<Record<string, { top: string, left: string }>>({});
    const [dirty, setDirty] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
    const mapRef = useRef<HTMLDivElement>(null);
    const draggedItemRef = useRef<{id: string; offsetX: number; offsetY: number} | null>(null);

    useEffect(() => {
        if (constituencies) {
            const initialCoords = constituencies.reduce((acc, c) => {
                acc[c.id] = c.mapCoordinates || { top: '50', left: '50' };
                return acc;
            }, {} as Record<string, {top: string, left: string}>);
            setCoords(initialCoords);
        }
    }, [constituencies]);
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
        e.preventDefault();
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const mapRect = mapRef.current!.getBoundingClientRect();

        draggedItemRef.current = {
            id,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!draggedItemRef.current || !mapRef.current) return;

        const mapRect = mapRef.current.getBoundingClientRect();
        const { id, offsetX, offsetY } = draggedItemRef.current;

        const newLeft = e.clientX - mapRect.left - offsetX;
        const newTop = e.clientY - mapRect.top - offsetY;

        const newLeftPercent = Math.max(0, Math.min(100, (newLeft / mapRect.width) * 100));
        const newTopPercent = Math.max(0, Math.min(100, (newTop / mapRect.height) * 100));
        
        setCoords(prev => ({
            ...prev,
            [id]: { top: newTopPercent.toFixed(2), left: newLeftPercent.toFixed(2) }
        }));
        setDirty(prev => ({ ...prev, [id]: true }));
    };

    const handleMouseUp = () => {
        if (draggedItemRef.current && dirty[draggedItemRef.current.id]) {
            handleSaveCoords(draggedItemRef.current.id);
        }
        draggedItemRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    const handleSaveCoords = (constituencyId: string) => {
        if (!firestore) return;
        
        setIsSaving(prev => ({ ...prev, [constituencyId]: true }));

        const newCoords = coords[constituencyId];
        const constituencyRef = doc(firestore, 'constituencies', constituencyId);
        
        updateDoc(constituencyRef, { mapCoordinates: newCoords })
            .then(() => {
                toast({ title: 'Saved!', description: `Coordinates for ${constituencies?.find(c=>c.id===constituencyId)?.name} have been updated.` });
                setDirty(prev => ({...prev, [constituencyId]: false}));
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
                setIsSaving(prev => ({ ...prev, [constituencyId]: false }));
            });
    };

    if (loadingConstituencies || loadingMap) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Overlays</CardTitle>
                <CardDescription>Drag and drop the labels on the map to set the position for each constituency. Changes are saved automatically.</CardDescription>
            </CardHeader>
            <CardContent>
                <div 
                  ref={mapRef}
                  className="relative w-full aspect-[4/5] max-w-2xl mx-auto border rounded-lg overflow-hidden bg-muted"
                >
                    {mapUrl ? (
                        <Image src={mapUrl} alt="Constituency Map" fill className="object-contain" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <p className="text-muted-foreground">No map uploaded.</p>
                        </div>
                    )}
                    {constituencies?.map(c => {
                        const pointCoords = coords[c.id];
                        if (!pointCoords) return null;

                        return (
                            <div 
                                key={c.id} 
                                className="absolute p-1 rounded-md text-xs font-bold text-white bg-black/50 transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
                                style={{ top: `${pointCoords.top}%`, left: `${pointCoords.left}%` }}
                                onMouseDown={e => handleMouseDown(e, c.id)}
                            >
                                {isSaving[c.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : c.name}
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
