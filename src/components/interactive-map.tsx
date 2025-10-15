
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

// Approximate coordinates (top %, left %) for each constituency
// These will likely need to be adjusted for the specific map image.
const constituencyCoords: { [key: string]: { top: string; left: string } } = {
  'Gros Islet': { top: '10%', left: '55%' },
  'Babonneau': { top: '25%', left: '50%' },
  'Castries North': { top: '35%', left: '35%' },
  'Castries East': { top: '40%', left: '45%' },
  'Castries Central': { top: '42%', left: '40%' },
  'Castries South': { top: '48%', left: '42%' },
  'Castries South East': { top: '50%', left: '50%' },
  'Anse La Raye/Canaries': { top: '60%', left: '30%' },
  'Soufriere': { top: '75%', left: '25%' },
  'Choiseul': { top: '85%', left: '35%' },
  'Laborie': { top: '90%', left: '45%' },
  'Vieux Fort South': { top: '95%', left: '60%' },
  'Vieux Fort North': { top: '90%', left: '68%' },
  'Micoud South': { top: '80%', left: '80%' },
  'Micoud North': { top: '70%', left: '75%' },
  'Dennery South': { top: '60%', left: '70%' },
  'Dennery North': { top: '50%', left: '65%' },
};


export function InteractiveMap({ constituencies }: InteractiveMapProps) {
  const { firestore } = useFirebase();
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: siteSettings, isLoading: loadingSettings } = useDoc(settingsRef);

  if (loadingSettings) {
    return <Skeleton className="w-full h-[600px]" />;
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
            height={1200}
            className="object-contain"
        />
        {constituencies.map(c => {
            const coords = constituencyCoords[c.name];
            if (!coords) return null;

            return (
                <Popover key={c.id}>
                    <PopoverTrigger asChild>
                        <button 
                            className="absolute w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ring-2 ring-white hover:scale-150 transition-transform duration-200"
                            style={{ top: coords.top, left: coords.left }}
                            aria-label={`Info for ${c.name}`}
                        />
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                        <div className="space-y-4">
                            <h4 className="font-semibold leading-none">{c.name}</h4>
                            <div className="flex items-center text-sm">
                                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span>{c.demographics.registeredVoters.toLocaleString()} Voters</span>
                            </div>
                             <Button asChild size="sm" className="w-full">
                                <Link href={`/constituencies/${c.id}`}>
                                    View Details
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )
        })}
    </div>
  );
}
