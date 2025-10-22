
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { UserMap, Constituency } from '@/lib/types';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function MapPageSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <Skeleton className="h-[80vh] w-full" />
            </div>
            <div className="space-y-4">
                 <Skeleton className="h-24 w-full" />
                 <Skeleton className="h-64 w-full" />
            </div>
        </div>
    )
}

export default function SavedMapPage() {
    const { mapId } = useParams();
    const { firestore } = useFirebase();

    const userMapRef = useMemoFirebase(() => (firestore && mapId ? doc(firestore, 'user_maps', Array.isArray(mapId) ? mapId[0] : mapId) : null), [firestore, mapId]);
    const { data: userMap, isLoading: loadingMap } = useDoc<UserMap>(userMapRef);
    
    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const mapConstituencies = useMemo(() => {
        if (!userMap || !constituencies) return [];
        return constituencies.map(c => {
            const savedLeaning = userMap.mapData.find(md => md.constituencyId === c.id);
            return {
                ...c,
                politicalLeaning: savedLeaning?.politicalLeaning || 'unselected',
            };
        });
    }, [userMap, constituencies]);

    if (loadingMap || loadingConstituencies) {
        return (
            <div className="container mx-auto px-4 py-8">
                <PageHeader title="User Prediction Map" description="Viewing a user's election prediction." />
                <MapPageSkeleton />
            </div>
        )
    }

    if (!userMap) {
        return (
            <div className="container mx-auto px-4 py-8">
                 <PageHeader title="Map Not Found" description="The prediction map you are looking for does not exist or has been deleted." />
            </div>
        )
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader title="User Prediction Map" description={`A prediction created on ${new Date(userMap.createdAt.toDate()).toLocaleDateString()}`} />
            <Card>
                <CardContent className="p-2">
                    <InteractiveSvgMap 
                        constituencies={mapConstituencies}
                        selectedConstituencyId={null}
                        onConstituencyClick={() => {}} // Read-only
                        isMakeYourOwn={true}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

