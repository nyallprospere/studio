
'use client';

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
    return <Skeleton className="w-full h-[70vh]" />;
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
    <div className="w-full relative aspect-[4/5]">
        <Image 
            src={siteSettings.mapUrl} 
            alt="Constituency Map of St. Lucia" 
            fill
            className="object-contain"
            priority
        />
        {constituencies.map(c => {
            const coords = c.mapCoordinates;
            if (!coords || !coords.top || !coords.left) {
                return null;
            }

            return (
                <Popover key={c.id}>
                    <PopoverTrigger asChild>
                        <button 
                            className="absolute w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ring-2 ring-white hover:scale-150 transition-transform duration-200"
                            style={{ top: `${coords.top}%`, left: `${coords.left}%` }}
                            aria-label={`Info for ${c.name}`}
                        />
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                        <div className="space-y-4">
                            <h4 className="font-semibold leading-none">{c.name}</h4>
                            <div className="flex items-center text-sm">
                                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span>{c.demographics?.registeredVoters?.toLocaleString() || 'N/A'} Voters</span>
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
