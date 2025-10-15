'use client';

import { useState, useEffect } from 'react';
import type { Constituency } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

interface ConstituencyMapProps {
  constituencies: Constituency[];
}

export function ConstituencyMap({ constituencies }: ConstituencyMapProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Find a constituency that has the mapImageUrl
    const constituencyWithMap = constituencies.find(c => c.mapImageUrl);
    if (constituencyWithMap && constituencyWithMap.mapImageUrl) {
      setMapUrl(constituencyWithMap.mapImageUrl);
    }
    setIsLoading(false);
  }, [constituencies]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-2">
            {isLoading ? (
              <Skeleton className="h-[600px] w-full" />
            ) : mapUrl ? (
              <div className="relative w-full h-[600px]">
                <Image src={mapUrl} alt="Constituency Map of St. Lucia" layout="fill" objectFit="contain" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                <p>No map has been uploaded yet. Please upload one in the admin panel.</p>
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
            <p className="text-muted-foreground">Constituency details will be shown here once the interactive map functionality is fully restored.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
