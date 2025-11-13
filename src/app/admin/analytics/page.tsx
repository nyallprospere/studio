'use client';

import { PageHeader } from '@/components/page-header';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Ad } from '@/lib/types';
import { DataTable } from './data-table';
import { columns } from './columns';

export default function AdAnalyticsPage() {
    const { firestore } = useFirebase();
    const adsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'ads') : null, [firestore]);
    const { data: ads, isLoading } = useCollection<Ad>(adsCollection);

    return (
        <div className="container mx-auto py-10">
            <PageHeader
                title="Ad Analytics"
                description="Review and analyze the performance of your ad campaigns."
            />
            {isLoading ? <p>Loading analytics data...</p> : <DataTable columns={columns} data={ads || []} />}
        </div>
    );
}
