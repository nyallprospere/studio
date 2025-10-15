
'use client';

import { useState } from 'react';
import type { Constituency } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';

interface InteractiveMapProps {
  constituencies: Constituency[];
}

export function InteractiveMap({ constituencies }: InteractiveMapProps) {
  const { firestore } = useFirebase();
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: siteSettings, isLoading: loadingSettings } = useDoc(settingsRef);

  if (loadingSettings) {
    return <Skeleton className="w-full h-96" />;
  }

  if (!siteSettings?.mapUrl) {
    return (
        <div className="w-full h-96 flex flex-col items-center justify-center bg-muted rounded-lg">
            <MapPin className="w-12 h-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No map has been uploaded yet.</p>
            <p className="text-xs text-muted-foreground">Admins can upload a map from the 'Manage Map' page.</p>
        </div>
    );
  }

  return (
    <div className="w-full h-auto flex items-center justify-center relative">
        <Image 
            src={siteSettings.mapUrl} 
            alt="Constituency Map of St. Lucia" 
            width={800} 
            height={600} 
            className="object-contain"
        />
    </div>
  );
}
