'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Constituency, Candidate, Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Users } from 'lucide-react';
import Link from 'next/link';

function ConstituencyDetailPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Skeleton className="h-96 w-full" />
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


export default function ConstituencyDetailPage() {
  const { id } = useParams();
  const { firestore } = useFirebase();

  const constituencyRef = useMemoFirebase(() => firestore ? doc(firestore, 'constituencies', id as string) : null, [firestore, id]);
  const { data: constituency, isLoading } = useDoc<Constituency>(constituencyRef);

  if (isLoading || !constituency) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ConstituencyDetailPageSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title={constituency.name}
        description={`Detailed information for the ${constituency.name} constituency.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          <Card>
            <CardContent className="p-0">
                {constituency.mapImageUrl && (
                    <div className="relative h-96 w-full">
                        <Image src={constituency.mapImageUrl} alt={`Map of ${constituency.name}`} fill className="object-contain" />
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center text-lg">
                        <Users className="w-5 h-5 mr-3 text-primary" />
                         <span className="font-semibold mr-2">Registered Voters:</span>
                        <span>{constituency.demographics.registeredVoters.toLocaleString()}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8">
                 <CardHeader>
                    <CardTitle>Polling Locations</CardTitle>
                </CardHeader>
                <CardContent>
                    {constituency.pollingLocations && constituency.pollingLocations.length > 0 ? (
                        <ul className="list-disc list-inside space-y-2">
                            {constituency.pollingLocations.map((location, index) => (
                                <li key={index}>{location}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">No polling locations listed.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
