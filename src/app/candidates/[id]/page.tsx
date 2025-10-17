
'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import type { Party, Candidate, Constituency } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { UserSquare, Shield } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

function CandidatePageSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start gap-4">
                 <Skeleton className="h-32 w-32 rounded-full" />
                 <div className="space-y-2 pt-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-6 w-48" />
                    <div className="flex items-center gap-2 pt-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-6 w-40" />
                    </div>
                 </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </CardContent>
        </Card>
    )
}


export default function CandidateDetailPage() {
  const { id } = useParams();
  const { firestore } = useFirebase();
  const candidateId = Array.isArray(id) ? id[0] : id;

  const candidateRef = useMemoFirebase(() => (firestore && candidateId ? doc(firestore, 'candidates', candidateId) : null), [firestore, candidateId]);
  const { data: candidate, isLoading: loadingCandidate } = useDoc<Candidate>(candidateRef);
  
  const partyRef = useMemoFirebase(() => (firestore && candidate ? doc(firestore, 'parties', candidate.partyId) : null), [firestore, candidate]);
  const { data: party, isLoading: loadingParty } = useDoc<Party>(partyRef);

  const constituencyRef = useMemoFirebase(() => (firestore && candidate ? doc(firestore, 'constituencies', candidate.constituencyId) : null), [firestore, candidate]);
  const { data: constituency, isLoading: loadingConstituency } = useDoc<Constituency>(constituencyRef);

  const isLoading = loadingCandidate || loadingParty || loadingConstituency;

  if (isLoading || !candidate) {
    return (
         <div className="container mx-auto px-4 py-8">
            <CandidatePageSkeleton />
         </div>
    );
  }

  const candidateName = `${candidate.firstName} ${candidate.lastName}`;
  const displayName = `${candidateName} ${candidate.isIncumbent ? '(Inc.)' : ''}`.trim();


  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <ScrollArea className="h-full pr-6">
          <CardHeader className="mb-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="relative h-32 w-32 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                {candidate.imageUrl ? (
                  <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                ) : (
                  <UserSquare className="h-full w-full text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <CardTitle className="font-headline text-3xl">{displayName}</CardTitle>
                <CardDescription className="text-lg">
                  Candidate for <span className="font-semibold text-foreground">{constituency?.name}</span>
                </CardDescription>
                {party && (
                  <div className="flex items-center gap-2 pt-2">
                     <div className="relative h-8 w-8 flex-shrink-0">
                        {party.logoUrl ? (
                            <Image src={party.logoUrl} alt={`${party.name} logo`} fill className="rounded-full object-contain" />
                        ) : (
                             <Shield className="w-8 h-8 text-muted-foreground" />
                        )}
                    </div>
                    <span className="font-semibold" style={{ color: party.color }}>
                      {party.name} ({party.acronym})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 text-sm">
            {candidate.bio && (
                <div>
                    <h4 className="font-semibold text-base mb-1 uppercase tracking-wider text-muted-foreground">Meet the Candidate</h4>
                    <p className="whitespace-pre-line text-foreground">{candidate.bio}</p>
                </div>
            )}
             {candidate.policyPositions && candidate.policyPositions.length > 0 && (
                <div>
                    <h4 className="font-semibold text-base mb-1 uppercase tracking-wider text-muted-foreground">Policy Positions</h4>
                    <ul className="space-y-2 list-disc pl-5">
                       {candidate.policyPositions.map((pos, index) => (
                           <li key={index}>
                               <span className="font-semibold">{pos.title}:</span> {pos.description}
                           </li>
                       ))}
                    </ul>
                </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}
