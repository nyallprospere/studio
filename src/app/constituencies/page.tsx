
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { InteractiveMap } from '@/components/interactive-map';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


const politicalLeaningOptions = [
  { value: 'solid-slp', label: 'Solid SLP', color: 'bg-red-700' },
  { value: 'lean-slp', label: 'Lean SLP', color: 'bg-red-400' },
  { value: 'tossup', label: 'Tossup', color: 'bg-purple-500' },
  { value: 'lean-uwp', label: 'Lean UWP', color: 'bg-yellow-300' },
  { value: 'solid-uwp', label: 'Solid UWP', color: 'bg-yellow-500' },
];


function ConstituenciesPageSkeleton() {
    return (
      <div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2 mt-2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="md:col-span-2">
                <Skeleton className="h-[70vh] w-full" />
            </div>
            <div>
                <Card>
                    <CardHeader><Skeleton className="h-8 w-2/3" /></CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </CardContent>
                </Card>
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

    const leaningSummary = useMemo(() => {
        if (!constituencies) {
            return politicalLeaningOptions.map(opt => ({ ...opt, count: 0 }));
        }

        const counts = constituencies.reduce((acc, constituency) => {
            const leaning = constituency.politicalLeaning || 'tossup';
            acc[leaning] = (acc[leaning] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return politicalLeaningOptions.map(option => ({
            ...option,
            count: counts[option.value] || 0,
        }));
    }, [constituencies]);


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
                    <CardTitle className="font-headline">Seat Count</CardTitle>
                    <CardDescription>Current political leaning of the 17 constituencies.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                        {leaningSummary.map(leaning => (
                            <li key={leaning.value} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={cn('w-4 h-4 rounded-full', leaning.color)}></span>
                                    <span className="font-medium text-sm">{leaning.label}</span>
                                </div>
                                <Badge variant="secondary" className="text-base font-bold">{leaning.count}</Badge>
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
