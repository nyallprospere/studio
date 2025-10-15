'use client';

import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';
import Link from 'next/link';

function ConstituenciesPageSkeleton() {
    return (
      <div>
        <Skeleton className="h-96 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
}

export default function ConstituenciesPage() {
    const { firestore } = useFirebase();
    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading } = useCollection<Constituency>(constituenciesQuery);

    const mapUrl = constituencies?.find(c => c.mapImageUrl)?.mapImageUrl;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Constituencies"
        description="Explore the 17 electoral districts of St. Lucia."
      />
      {isLoading ? (
          <ConstituenciesPageSkeleton />
      ) : (
        <div className="space-y-8">
            {mapUrl ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Electoral Map</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mapUrl} alt="Constituency Map" className="w-full h-auto rounded-lg border" />
                    </CardContent>
                </Card>
            ): (
                <div className="text-center py-10 text-muted-foreground bg-muted rounded-lg">
                    <p>The constituency map has not been uploaded yet.</p>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {constituencies?.map(c => (
                    <Card key={c.id}>
                        <CardHeader>
                            <CardTitle>{c.name}</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-2">
                             <div className="flex items-center text-sm">
                                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span className="font-semibold mr-2">Population:</span>
                                <span>{c.demographics.population.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center text-sm">
                                <Users className="w-4 h-4 mr-2 text-primary" />
                                <span className="font-semibold mr-2">Voters:</span>
                                <span>{c.demographics.registeredVoters.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
