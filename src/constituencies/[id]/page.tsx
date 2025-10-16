'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Constituency, Candidate, Party } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Users, UserSquare } from 'lucide-react';
import Link from 'next/link';

function ConstituencyDetailPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
        <div>
           <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
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

  const constituencyRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'constituencies', id as string) : null, [firestore, id]);
  const { data: constituency, isLoading: loadingConstituency } = useDoc<Constituency>(constituencyRef);

  const candidatesQuery = useMemoFirebase(() => firestore && id ? query(collection(firestore, 'candidates'), where('constituencyId', '==', id)) : null, [firestore, id]);
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

  const getParty = (partyId: string) => parties?.find(p => p.id === partyId);

  const isLoading = loadingConstituency || loadingCandidates || loadingParties;

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
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
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Candidates</CardTitle>
                    <CardDescription>Individuals contesting in this constituency.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loadingCandidates ? <p>Loading candidates...</p> : 
                    candidates && candidates.length > 0 ? (
                        candidates.map(candidate => {
                            const party = getParty(candidate.partyId);
                            const candidateName = `${candidate.firstName} ${candidate.lastName}`;
                            return (
                                <Link key={candidate.id} href={`/candidates/${candidate.id}`} className="flex items-center gap-4 p-2 rounded-md hover:bg-accent transition-colors">
                                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                                    {candidate.imageUrl ? (
                                        <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                                    ) : (
                                        <UserSquare className="h-full w-full text-muted-foreground" />
                                    )}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{candidateName}</p>
                                        {party && <p className="text-sm" style={{color: party.color}}>{party.name}</p>}
                                    </div>
                                </Link>
                            )
                        })
                    ) : (
                        <p className="text-muted-foreground">No candidates have been declared for this constituency yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
