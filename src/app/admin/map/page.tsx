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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const politicalLeaningOptions = [
  { value: 'solid-slp', label: 'Solid SLP', color: 'bg-red-700' },
  { value: 'lean-slp', label: 'Lean SLP', color: 'bg-red-400' },
  { value: 'tossup', label: 'Tossup', color: 'bg-purple-500' },
  { value: 'lean-uwp', label: 'Lean UWP', color: 'bg-yellow-300' },
  { value: 'solid-uwp', label: 'Solid UWP', color: 'bg-yellow-500' },
];

const getLeaningInfo = (leaning: string | undefined, constituencyName: string) => {
    if (constituencyName === 'Castries North' && (leaning === 'solid-slp' || leaning === 'lean-slp')) {
        return {
            className: '',
            style: {
                background: 'repeating-linear-gradient(45deg, #4299e1, #4299e1 10px, #e53e3e 10px, #e53e3e 20px)'
            }
        };
    }
    const colorClass = politicalLeaningOptions.find(o => o.value === leaning)?.color || 'bg-gray-500';
    return { className: colorClass, style: {} };
}

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
            description="Upload the constituency map and manage the overlay positions and colors."
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
    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
    
    const [coords, setCoords] = useState<Record<string, { top: string, left: string }>>({});
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (constituencies) {
            const initialCoords = constituencies.reduce((acc, c) => {
                acc[c.id] = c.mapCoordinates || { top: '50', left: '50' };
                return acc;
            }, {} as Record<string, {top: string, left: string}>);
            setCoords(initialCoords);
        }
    }, [constituencies]);

    const handleLeaningChange = (constituencyId: string, leaning: string) => {
        if (!firestore) return;
        const constituencyRef = doc(firestore, 'constituencies', constituencyId);
        updateDoc(constituencyRef, { politicalLeaning: leaning })
            .catch((error) => {
                 const contextualError = new FirestorePermissionError({
                    path: constituencyRef.path,
                    operation: 'update',
                    requestResourceData: { politicalLeaning: leaning }
                });
                errorEmitter.emit('permission-error', contextualError);
            });
    }

    if (loadingConstituencies || loadingMap) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Overlays</CardTitle>
                <CardDescription>Click a label to set its color.</CardDescription>
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

                        const { className: leaningClassName, style: leaningStyle } = getLeaningInfo(c.politicalLeaning, c.name);

                        return (
                           <Popover key={c.id}>
                                <PopoverTrigger asChild>
                                    <button 
                                        className={cn("absolute p-2 rounded-md text-sm font-bold text-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer", leaningClassName)}
                                        style={{ top: `${pointCoords.top}%`, left: `${pointCoords.left}%`, ...leaningStyle }}
                                    >
                                        {c.name}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64">
                                     <div className="space-y-4">
                                        <h4 className="font-semibold leading-none">Set Leaning for {c.name}</h4>
                                        <RadioGroup defaultValue={c.politicalLeaning || 'tossup'} onValueChange={(leaning) => handleLeaningChange(c.id, leaning)}>
                                            {politicalLeaningOptions.map(option => (
                                                <div key={option.value} className="flex items-center space-x-2">
                                                    <RadioGroupItem value={option.value} id={`${c.id}-${option.value}`} />
                                                    <Label htmlFor={`${c.id}-${option.value}`} className="flex items-center gap-2">
                                                        <span className={cn('w-4 h-4 rounded-full', option.color)}></span>
                                                        {option.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
