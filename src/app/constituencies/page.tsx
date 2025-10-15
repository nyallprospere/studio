
'use client';

import { useEffect, useState } from 'react';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { InteractiveMap } from '@/components/interactive-map';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

function ConstituenciesPageSkeleton() {
    return (
      <div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2 mt-2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="md:col-span-2">
                <Skeleton className="h-96 w-full" />
            </div>
            <div>
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
      </div>
    );
}

export default function ConstituenciesPage() {
    const { firestore } = useFirebase();

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const isLoading = loadingConstituencies;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Constituencies"
        description="Explore the 17 electoral districts of St. Lucia."
      />
      {isLoading || !constituencies ? (
          <ConstituenciesPageSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <CardContent className="p-2">
                         <InteractiveMap constituencies={constituencies} />
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="font-headline">Constituencies</CardTitle>
                    <CardDescription>Click a constituency on the map or select from the list.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
                        {constituencies.map(c => (
                            <li key={c.id}>
                                <Link href={`/constituencies/${c.id}`} className="block p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                    {c.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                  </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}
