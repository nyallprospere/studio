'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/layout/main-layout';

function InteractiveMapPageSkeleton() {
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


export default function ConstituenciesPage() {
    const { firestore } = useFirebase();
    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
    
    const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);

    const selectedConstituency = useMemo(() => {
        if (!selectedConstituencyId || !constituencies) return null;
        return constituencies.find(c => c.id === selectedConstituencyId);
    }, [selectedConstituencyId, constituencies]);

    if (loadingConstituencies) {
        return (
             <MainLayout>
                <div className="container mx-auto px-4 py-8">
                    <PageHeader
                        title=""
                        description="Click on a district to begin."
                    />
                    <InteractiveMapPageSkeleton />
                </div>
             </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    title=""
                    description="Click on a district to begin."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <Card>
                            <CardContent className="p-2">
                                <InteractiveSvgMap 
                                    constituencies={constituencies ?? []}
                                    selectedConstituencyId={selectedConstituencyId}
                                    onConstituencyClick={setSelectedConstituencyId}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Constituency Details</CardTitle>
                                <CardDescription>
                                    {selectedConstituency ? `Information for ${selectedConstituency.name}`: 'Select a constituency on the map.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {selectedConstituency ? (
                                    <div className="space-y-2">
                                        <p><span className="font-semibold">Name:</span> {selectedConstituency.name}</p>
                                        <p><span className="font-semibold">Registered Voters:</span> {selectedConstituency.demographics.registeredVoters?.toLocaleString() || 'N/A'}</p>
                                        <p><span className="font-semibold">Political Leaning:</span> {selectedConstituency.politicalLeaning || 'Tossup'}</p>
                                    </div>
                                ) : (
                                <p className="text-muted-foreground">No constituency selected.</p> 
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
