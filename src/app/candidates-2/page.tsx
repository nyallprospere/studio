
'use client';

import { useMemo } from 'react';
import type { Candidate, Party, Constituency } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { firestore } = useFirebase();

  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const { data: constituencies } = useCollection<Constituency>(constituenciesQuery);

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const { data: parties } = useCollection<Party>(partiesQuery);

  const party = parties?.find(p => p.id === candidate.partyId);
  const constituency = constituencies?.find(c => c.id === candidate.constituencyId);
  const candidateName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow h-full">
      <CardHeader className="p-0">
        {candidate.imageUrl && (
          <div className="relative h-56 w-full">
            <Image
              src={candidate.imageUrl}
              alt={`Photo of ${candidateName}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <div className="p-6">
            <CardTitle className="font-headline text-xl">{candidateName}</CardTitle>
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
}

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
  const { firestore } = useFirebase();

  const partiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'parties'), where('acronym', '==', 'SLP')) : null, [firestore]);
  const { data: slpParties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const slpParty = slpParties?.[0];

  const candidatesQuery = useMemoFirebase(() => firestore && slpParty ? query(collection(firestore, 'candidates'), where('partyId', '==', slpParty.id)) : null, [firestore, slpParty]);
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);

  const loading = loadingCandidates || loadingParties;

  const sortCandidates = (a: Candidate, b: Candidate) => {
    // Party Leader first
    if (a.isPartyLeader) return -1;
    if (b.isPartyLeader) return 1;
    
    // Deputy Leader next
    if (a.isDeputyLeader && !b.isDeputyLeader) return -1;
    if (!a.isDeputyLeader && b.isDeputyLeader) return 1;

    // Higher partyLevel next
    if (a.partyLevel === 'higher' && b.partyLevel !== 'higher') return -1;
    if (a.partyLevel !== 'higher' && b.partyLevel === 'higher') return 1;
    
    // Then alphabetically by last name
    return (a.lastName || '').localeCompare(b.lastName || '');
  };

  const {
    slpLeader,
    featuredSlpCandidates,
    otherSlpCandidates,
  } = useMemo(() => {
    if (!candidates || !slpParty) {
      return {
        slpLeader: null,
        featuredSlpCandidates: [],
        otherSlpCandidates: [],
      };
    }
    
    const slpCandidates = candidates.filter(c => c.partyId === slpParty?.id).sort(sortCandidates);

    const slpLeader = slpCandidates.find(c => c.isPartyLeader);
    const featuredSlpCandidates = slpCandidates.filter(c => c.isDeputyLeader);
    const otherSlpCandidates = slpCandidates.filter(c => !c.isPartyLeader && !c.isDeputyLeader);

    return {
      slpLeader,
      featuredSlpCandidates,
      otherSlpCandidates,
    };
  }, [candidates, slpParty]);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="SLP Candidates"
        description="Meet the individuals contesting for the Saint Lucia Labour Party."
      />

      <div className="space-y-12">
        <section id="slp-candidates">
          {loading ? (
            <div className="space-y-8">
              <div className="max-w-sm mx-auto"><CandidateCardSkeleton /></div>
              <div className="grid gap-6 md:grid-cols-2 justify-center max-w-4xl mx-auto">
                 <CandidateCardSkeleton />
                 <CandidateCardSkeleton />
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <CandidateCardSkeleton key={i} />)}
              </div>
            </div>
          ) : slpParty ? (
           <>
            {slpLeader && (
              <div className="mb-8">
                <h3 className="text-center text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-2">Party Leader</h3>
                <div className="max-w-sm mx-auto">
                  <CandidateCard candidate={slpLeader} />
                </div>
              </div>
            )}
            {featuredSlpCandidates.length > 0 && (
              <div className="mb-8">
                  <h3 className="text-center text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4">Deputy Leaders</h3>
                  <div className="grid gap-6 md:grid-cols-2 justify-center max-w-4xl mx-auto">
                      {featuredSlpCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)}
                  </div>
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {otherSlpCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)}
            </div>
            {candidates?.length === 0 && (
                 <p className="text-muted-foreground col-span-full text-center">No SLP candidates have been added yet.</p>
            )}
           </>
          ) : (
             <p className="text-muted-foreground col-span-full text-center">Saint Lucia Labour Party not found.</p>
          )}
        </section>
      </div>
    </div>
  );
}
