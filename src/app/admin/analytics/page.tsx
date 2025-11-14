'use client';

import { PageHeader } from '@/components/page-header';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Ad, AdClick } from '@/lib/types';
import { DataTable } from './data-table';
import { columns } from './columns';
import { useState } from 'react';
import { AdClicksDialog } from './ad-clicks-dialog';

export default function AdAnalyticsPage() {
    const { firestore } = useFirebase();
    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

    const adsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'ads') : null, [firestore]);
    const { data: ads, isLoading } = useCollection<Ad>(adsCollection);

    const adClicksQuery = useMemoFirebase(() => {
        if (!firestore || !selectedAd) return null;
        return query(collection(firestore, 'ad_clicks'), where('adId', '==', selectedAd.id));
    }, [firestore, selectedAd]);
    
    const { data: adClicks, isLoading: loadingClicks } = useCollection<AdClick>(adClicksQuery);

    const handleViewClicks = (ad: Ad) => {
        setSelectedAd(ad);
    };

    return (
        <div className="container mx-auto py-10">
            <PageHeader
                title="Ad Analytics"
                description="Review and analyze the performance of your ad campaigns."
            />
            {isLoading ? (
                <p>Loading analytics data...</p>
            ) : (
                <DataTable columns={columns(handleViewClicks)} data={ads || []} />
            )}
            <AdClicksDialog
                isOpen={!!selectedAd}
                onClose={() => setSelectedAd(null)}
                ad={selectedAd}
                clicks={adClicks || []}
                isLoading={loadingClicks}
            />
        </div>
    );
}
