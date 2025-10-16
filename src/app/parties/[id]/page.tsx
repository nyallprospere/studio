
'use client';

import { useParams } from 'next/navigation';
import type { Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Shield, Link as LinkIcon } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';

function PartyPageSkeleton() {
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
        <Skeleton className="h-24 w-full" />
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
         <Skeleton className="h-6 w-28" />
         <Skeleton className="h-6 w-24" />
      </CardFooter>
    </Card>
  );
}


export default function PartyDetailPage() {
  const { id } = useParams();
  const { firestore } = useFirebase();

  const partyRef = useMemoFirebase(() => (firestore && id ? doc(firestore, 'parties', Array.isArray(id) ? id[0] : id) : null), [firestore, id]);
  const { data: party, isLoading } = useDoc<Party>(partyRef);

  if (isLoading || !party) {
    return (
        <div className="container mx-auto px-4 py-8">
            <PartyPageSkeleton />
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
       <Card className="flex flex-col overflow-hidden" style={{ borderTop: `4px solid ${party.color}` }}>
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
              <CardContent className="flex-grow space-y-4">
                <div>
                    <h4 className="font-semibold text-sm mb-1">About the Party</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{party.description || 'No description available.'}</p>
                </div>
                 {party.history && (
                  <div>
                      <h4 className="font-semibold text-sm mb-1">Party History</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{party.history}</p>
                  </div>
                 )}
                <div>
                    <h4 className="font-semibold text-sm mb-1">Manifesto Summary</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{party.manifestoSummary || 'No summary available.'}</p>
                </div>
              </CardContent>
              <CardFooter className="flex-wrap gap-2">
                 {party.manifestoUrl && (
                    <Link href={party.manifestoUrl} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline">View Full Manifesto (PDF)</Badge>
                    </Link>
                )}
                {party.website && (
                    <Link href={party.website} target="_blank" rel="noopener noreferrer">
                         <Badge variant="outline" className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Visit Website
                        </Badge>
                    </Link>
                )}
              </CardFooter>
            </Card>
    </div>
  );
}
