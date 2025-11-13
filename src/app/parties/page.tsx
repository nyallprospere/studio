'use client';

import type { Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Shield, ArrowRight } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
      </CardContent>
       <CardFooter>
        <Skeleton className="h-10 w-32" />
      </CardFooter>
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
    <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
        {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <PartyCardSkeleton key={i} />)
        ) : (
        parties?.map((party) => (
            <Card key={party.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow" style={{ borderTop: `4px solid ${party.color}` }}>
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
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{party.description || 'No description available.'}</p>
            </CardContent>
            <CardFooter>
                <Button asChild variant="secondary">
                    <Link href={`/parties/${party.id}`}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
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
