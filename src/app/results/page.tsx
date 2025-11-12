'use client';

import { Suspense } from 'react';
import ResultsClientPage from './results-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { MainLayout } from '@/components/layout/main-layout';

function ResultsPageSkeleton() {
    return (
        <MainLayout>
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                title="Past Election Results"
                />
                <div className="mb-6 flex justify-end">
                    <Skeleton className="h-10 w-[280px]" />
                </div>
                <Skeleton className="h-[600px] w-full" />
            </div>
        </MainLayout>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<ResultsPageSkeleton />}>
            <ResultsClientPage />
        </Suspense>
    );
}
