'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Constituency } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';

interface ConstituencyMapProps {
  constituencies: Constituency[];
}

export function ConstituencyMap({ constituencies }: ConstituencyMapProps) {
  const router = useRouter();
  const { firestore } = useFirebase();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: siteSettings, isLoading: loadingSettings } = useDoc(settingsRef);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-2">
            {loadingSettings && <p>Loading map...</p>}
            {siteSettings?.mapUrl && (
                <div className="relative w-full h-[600px]">
                    <Image src={siteSettings.mapUrl} alt="Constituency Map" fill className="object-contain"/>
                </div>
            )}
            {!siteSettings?.mapUrl && !loadingSettings && (
                 <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">No map has been uploaded yet.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="font-headline">Constituencies</CardTitle>
            <CardDescription>Click a constituency to see more details.</CardDescription>
          </CardHeader>
          <CardContent>
            {constituencies ? (
                <ul className="space-y-2">
                    {constituencies.map(c => (
                        <li key={c.id}>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start">
                                        {c.name}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent>
                                    <div className="space-y-4">
                                        <h4 className="font-bold font-headline">{c.name}</h4>
                                        <div className="flex items-center">
                                            <Users className="w-4 h-4 mr-2" />
                                            <span className="font-semibold mr-2">Voters:</span>
                                            <span>{c.demographics.registeredVoters.toLocaleString()}</span>
                                        </div>
                                        <Button asChild size="sm" className="w-full">
                                            <Link href={`/constituencies/${c.id}`}>
                                                View Details <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </li>
                    ))}
                </ul>
            ) : (
              <p className="text-muted-foreground">No constituencies available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
