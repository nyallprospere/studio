
'use client';

import { Suspense } from 'react';
import MakeYourOwnClientPage from './make-your-own-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';

function MakeYourOwnPageSkeleton() {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="Make Your Own Election Map" description="Create and share your 2026 election prediction by assigning a winner to each constituency." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="md:col-span-1">
                <Skeleton className="h-[70vh] w-full" />
            </div>
            <div>
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
      </div>
    );
}


export default function MakeYourOwnPage() {
    return (
        <Suspense fallback={<MakeYourOwnPageSkeleton />}>
            <MakeYourOwnClientPage />
        </Suspense>
    );
}
