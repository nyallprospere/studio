'use client';

import type { Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Shield } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

function PartyCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartiesPage() {
  const { firestore } = useFirebase();
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const { data: parties, isLoading } = useCollection<Party>(partiesQuery);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Political Parties"
        description="Learn more about the political parties in St. Lucia."
      />
      <div className="grid gap-8 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <PartyCardSkeleton key={i} />)
        ) : (
          parties?.map((party) => (
            <Card key={party.id} className="overflow-hidden hover:shadow-lg transition-shadow" style={{ borderTop: `4px solid ${party.color}` }}>
              <CardHeader className="flex flex-row items-start gap-4">
                {party.logoUrl ? (
                    <div className="relative h-16 w-16 flex-shrink-0">
                        <Image src={party.logoUrl} alt={`${party.name} logo`} fill className="rounded-full object-contain" />
                    </div>
                ) : (
                    <div className="h-16 w-16 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                        <Shield className="w-8 h-8 text-muted-foreground" />
                    </div>
                )}
                <div>
                  <CardTitle className="font-headline text-2xl">{party.name} ({party.acronym})</CardTitle>
                  <CardDescription>Led by {party.leader} &bull; Founded in {party.founded}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                    <h4 className="font-semibold text-sm mb-1">About the Party</h4>
                    <p className="text-sm text-muted-foreground">{party.description || 'No description available.'}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm mb-1">Manifesto Summary</h4>
                    <p className="text-sm text-muted-foreground">{party.manifestoSummary || 'No summary available.'}</p>
                </div>
                 {party.manifestoUrl && (
                    <div>
                        <a href={party.manifestoUrl} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline">View Full Manifesto (PDF)</Badge>
                        </a>
                    </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        {parties?.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground col-span-2">No parties have been added yet.</p>
        )}
      </div>
    </div>
  );
}
