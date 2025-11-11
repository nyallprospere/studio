'use client';

import { Suspense } from 'react';
import MakeYourOwnClientPage from './make-your-own-client-page';
import { Skeleton } from '@/components/ui/skeleton';

function MakeYourOwnPageSkeleton() {
    return (
      <div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2 mt-2" />
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
