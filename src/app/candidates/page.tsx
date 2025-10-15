'use client';

import { useCollection } from '@/firebase/hooks/use-collection';
import type { Candidate, Party, Constituency } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

function CandidateCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="p-0">
        <Skeleton className="h-56 w-full" />
        <div className="p-6 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

export default function CandidatesPage() {
  const { data: candidates, loading: loadingCandidates } = useCollection<Candidate>('candidates');
  const { data: parties, loading: loadingParties } = useCollection<Party>('parties');
  const { data: constituencies, loading: loadingConstituencies } = useCollection<Constituency>('constituencies');

  const loading = loadingCandidates || loadingParties || loadingConstituencies;

  const getPartyById = (id: string) => parties?.find(p => p.id === id);
  const getConstituencyById = (id: string) => constituencies?.find(c => c.id === id);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="2026 Candidates"
        description="Meet the individuals contesting in the upcoming general elections."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <CandidateCardSkeleton key={i} />)
        ) : (
          candidates?.map((candidate) => {
            const party = getPartyById(candidate.partyId);
            const constituency = getConstituencyById(candidate.constituencyId);

            return (
              <Card key={candidate.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  {candidate.imageUrl && (
                    <div className="relative h-56 w-full">
                      <Image
                        src={candidate.imageUrl}
                        alt={`Photo of ${candidate.name}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="p-6">
                      <CardTitle className="font-headline text-xl">{candidate.name}</CardTitle>
                      {party && (
                        <CardDescription style={{ color: party.color }}>
                          {party.name} ({party.acronym})
                        </CardDescription>
                      )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">
                    Running in: <span className="font-semibold text-foreground">{constituency?.name}</span>
                  </p>
                  <p className="mt-2 text-sm line-clamp-3">{candidate.bio}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                      <Link href={`/candidates/${candidate.id}`}>View Full Profile</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
