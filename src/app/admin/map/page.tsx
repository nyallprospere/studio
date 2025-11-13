'use client';

import { useState, useEffect } from 'react';
import { useDoc, useFirebase, useCollection } from '@/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { uploadFile, deleteFile } from '@/firebase/storage';
import Image from 'next/image';
import { Loader2, UploadCloud } from 'lucide-react';
import type { SiteSettings, Constituency } from '@/lib/types';
import { useMemoFirebase } from '@/firebase';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';


export default function AdminMapPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: siteSettings, isLoading: loadingSettings } = useDoc<SiteSettings>(settingsRef);
  
  const constituenciesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesCollection);

  const [mapFile, setMapFile] = useState<File | null>(null);
  const [currentMapUrl, setCurrentMapUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);


  useEffect(() => {
    if (siteSettings) {
      setCurrentMapUrl(siteSettings.mapUrl);
    }
  }, [siteSettings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMapFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!mapFile || !firestore || !settingsRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a file to upload.' });
      return;
    }
    
    setIsUploading(true);
    try {
      // If a map already exists, delete the old one first
      if (currentMapUrl) {
        try {
            await deleteFile(currentMapUrl);
        } catch (e) {
            console.warn("Could not delete old map, it may have already been removed.", e)
        }
      }
      
      const newMapUrl = await uploadFile(mapFile, `maps/constituency_map_${Date.now()}`);
      
      await setDoc(settingsRef, { mapUrl: newMapUrl }, { merge: true });
      
      setCurrentMapUrl(newMapUrl);
      setMapFile(null);
      toast({ title: 'Success', description: 'Constituency map has been updated.' });
    } catch (error) {
      console.error('Map upload error:', error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the map.' });
    } finally {
      setIsUploading(false);
    }
  };
  
  const isLoading = loadingSettings || loadingConstituencies;

  return (
    <div className="container mx-auto px-4 py-8">
    <PageHeader
        title="Manage Constituency Map"
        description="A preview of the interactive map used on the dashboard page."
    />
    
    <div className="grid grid-cols-1 gap-8">
        <Card>
            <CardHeader>
            <CardTitle>Map Preview</CardTitle>
            <CardDescription>This is a preview of the currently active map.</CardDescription>
            </CardHeader>
            <CardContent className="relative">
                {isLoading ? (
                    <p>Loading map preview...</p>
                ) : (
                <InteractiveSvgMap 
                    constituencies={constituencies ?? []} 
                    selectedConstituencyId={selectedConstituencyId}
                    onConstituencyClick={setSelectedConstituencyId}
                />
                )}
            </CardContent>
        </Card>
    </div>
    </div>
  );
}
