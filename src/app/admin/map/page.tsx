
'use client';

import { useState, useEffect } from 'react';
import { useDoc, useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { uploadFile, deleteFile } from '@/firebase/storage';
import Image from 'next/image';
import { Loader2, UploadCloud } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';
import { useMemoFirebase } from '@/firebase';

export default function AdminMapPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: siteSettings, isLoading: loadingSettings } = useDoc<SiteSettings>(settingsRef);
  
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [currentMapUrl, setCurrentMapUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

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
    if (!mapFile || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a file to upload.' });
      return;
    }
    
    setIsUploading(true);
    try {
      // If a map already exists, delete the old one first
      if (currentMapUrl) {
        await deleteFile(currentMapUrl);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Constituency Map"
        description="Upload and update the main map image used on the constituencies page."
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Map Uploader</CardTitle>
          <CardDescription>Upload an image (e.g., SVG, PNG) for the interactive map background.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Input type="file" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
            <p className="text-xs text-muted-foreground">For best results, use an SVG with a clear background.</p>
          </div>
          <Button onClick={handleUpload} disabled={!mapFile || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
                <>
                 <UploadCloud className="mr-2 h-4 w-4" />
                 Upload & Save Map
                </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Current Map Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <p>Loading map preview...</p>
          ) : currentMapUrl ? (
            <div className="relative w-full max-w-2xl mx-auto aspect-square bg-muted rounded-md p-4">
              <Image src={currentMapUrl} alt="Current Constituency Map" fill className="object-contain" />
            </div>
          ) : (
            <p className="text-muted-foreground">No map has been uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
