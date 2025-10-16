
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
import { collection } from 'firebase/firestore';

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

  const candidatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);

  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

  const loading = loadingCandidates || loadingParties;

  const {
    uwpLeader,
    featuredUwpCandidates,
    otherUwpCandidates,
    slpLeader,
    featuredSlpCandidates,
    otherSlpCandidates,
  } = useMemo(() => {
    if (!candidates || !parties) {
      return {
        uwpLeader: null,
        featuredUwpCandidates: [],
        otherUwpCandidates: [],
        slpLeader: null,
        featuredSlpCandidates: [],
        otherSlpCandidates: [],
      };
    }
    const uwp = parties.find(p => p.acronym === 'UWP');
    const slp = parties.find(p => p.acronym === 'SLP');

    const getUwpSortOrder = (candidate: Candidate) => {
      const name = `${candidate.firstName} ${candidate.lastName}`;
      if (name === 'Guy Joseph') return 1;
      if (name === 'Dominic Fedee') return 2;
      return 3;
    };

    const getSlpSortOrder = (candidate: Candidate) => {
      const name = `${candidate.firstName} ${candidate.lastName}`;
      if (name === 'Ernest Hilaire') return 1;
      if (name === 'Shawn Edward') return 2;
      return 3;
    };

    const uwpLeader = candidates.find(c => c.partyId === uwp?.id && c.isPartyLeader);
    const slpLeader = candidates.find(c => c.partyId === slp?.id && c.isPartyLeader);

    const uwpCandidates = candidates
      .filter(c => c.partyId === uwp?.id && !c.isPartyLeader)
      .sort((a, b) => getUwpSortOrder(a) - getUwpSortOrder(b));

    const slpCandidates = candidates
      .filter(c => c.partyId === slp?.id && !c.isPartyLeader)
      .sort((a, b) => getSlpSortOrder(a) - getSlpSortOrder(b));

    return {
      uwpLeader,
      featuredUwpCandidates: uwpCandidates.slice(0, 2),
      otherUwpCandidates: uwpCandidates.slice(2),
      slpLeader,
      featuredSlpCandidates: slpCandidates.slice(0, 2),
      otherSlpCandidates: slpCandidates.slice(2),
    };
  }, [candidates, parties]);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="2026 Candidates"
        description="Meet the individuals contesting in the upcoming general elections."
      />

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-headline font-bold text-primary mb-6">UWP Candidates</h2>
          {loading ? (
            <CandidateCardSkeleton />
          ) : uwpLeader ? (
            <div className="mb-8">
              <h3 className="text-center text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-2">Party Leader</h3>
              <div className="max-w-sm mx-auto">
                <CandidateCard candidate={uwpLeader} />
              </div>
            </div>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 max-w-4xl mx-auto mb-8">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <CandidateCardSkeleton key={i} />)
            ) : featuredUwpCandidates.length > 0 ? (
              featuredUwpCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)
            ) : null}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <CandidateCardSkeleton key={i} />)
            ) : otherUwpCandidates.length > 0 ? (
              otherUwpCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)
            ) : !uwpLeader && featuredUwpCandidates.length === 0 ? (
              <p className="text-muted-foreground col-span-full">No UWP candidates have been added yet.</p>
            ) : null}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-headline font-bold text-primary mb-6">SLP Candidates</h2>
          {loading ? (
            <CandidateCardSkeleton />
          ) : slpLeader ? (
            <div className="mb-8">
              <h3 className="text-center text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-2">Party Leader</h3>
              <div className="max-w-sm mx-auto">
                <CandidateCard candidate={slpLeader} />
              </div>
            </div>
          ) : null}
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 max-w-4xl mx-auto mb-8">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <CandidateCardSkeleton key={i} />)
            ) : featuredSlpCandidates.length > 0 ? (
              featuredSlpCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)
            ) : null}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <CandidateCardSkeleton key={i} />)
            ) : otherSlpCandidates.length > 0 ? (
              otherSlpCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)
            ) : !slpLeader && featuredSlpCandidates.length === 0 ? (
              <p className="text-muted-foreground col-span-full">No SLP candidates have been added yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

