'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Constituency } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';

interface ConstituencyMapProps {
  constituencies: Constituency[];
}

export function ConstituencyMap({ constituencies }: ConstituencyMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();
  const { firestore } = useFirebase();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: siteSettings, isLoading: loadingSettings } = useDoc(settingsRef);

  const handleConstituencyClick = (name: string) => {
    const constituency = constituencies.find(c => c.name === name);
    if (constituency) {
      router.push(`/constituencies/${constituency.id}`);
    }
  };

  const hoveredData = hovered
    ? constituencies.find((c) => c.name === hovered)
    : null;

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
            <CardTitle className="font-headline">Constituency Info</CardTitle>
          </CardHeader>
          <CardContent>
            {constituencies ? (
                <ul className="space-y-2">
                    {constituencies.map(c => (
                        <li key={c.id}>
                            <Button variant="ghost" onClick={() => router.push(`/constituencies/${c.id}`)} className="w-full justify-start">
                                {c.name}
                            </Button>
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
