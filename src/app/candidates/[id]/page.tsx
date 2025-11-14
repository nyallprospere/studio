'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import type { Party, Candidate, Constituency, Election, PartyLogo, Reel } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { UserSquare, Shield, Facebook } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';

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
  
  const partyRef = useMemoFirebase(() => (firestore && candidate && !candidate.isIndependentCastriesNorth && !candidate.isIndependentCastriesCentral ? doc(firestore, 'parties', candidate.partyId) : null), [firestore, candidate]);
  const { data: party, isLoading: loadingParty } = useDoc<Party>(partyRef);

  const constituencyRef = useMemoFirebase(() => (firestore && candidate ? doc(firestore, 'constituencies', candidate.constituencyId) : null), [firestore, candidate]);
  const { data: constituency, isLoading: loadingConstituency } = useDoc<Constituency>(constituencyRef);

  const currentElectionQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), where('isCurrent', '==', true)) : null, [firestore]);
  const { data: currentElections, isLoading: loadingElections } = useCollection<Election>(currentElectionQuery);
  const currentElection = useMemo(() => currentElections?.[0], [currentElections]);
  
  const independentLogoQuery = useMemoFirebase(() => {
    if (!firestore || !candidate || !currentElection || (!candidate.isIndependentCastriesNorth && !candidate.isIndependentCastriesCentral)) return null;
    return query(
        collection(firestore, 'party_logos'),
        where('partyId', '==', 'independent'),
        where('electionId', '==', currentElection.id),
        where('constituencyId', '==', candidate.constituencyId)
    );
  }, [firestore, candidate, currentElection]);
  const { data: independentLogos, isLoading: loadingLogos } = useCollection<PartyLogo>(independentLogoQuery);
  const independentLogo = useMemo(() => independentLogos?.[0], [independentLogos]);

  const reelsQuery = useMemoFirebase(() => {
    if (!firestore || !candidateId) return null;
    return query(collection(firestore, 'reels'), where('candidateId', '==', candidateId));
  }, [firestore, candidateId]);
  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);


  const isLoading = loadingCandidate || loadingParty || loadingConstituency || loadingElections || loadingLogos || loadingReels;

  if (isLoading || !candidate) {
    return (
        <div className="container mx-auto px-4 py-8">
            <CandidatePageSkeleton />
        </div>
    );
  }

  const candidateName = `${candidate.firstName} ${candidate.lastName}`;
  const displayName = `${candidateName} ${candidate.isIncumbent ? '(Inc.)' : ''}`.trim();
  const isIndependent = candidate.isIndependentCastriesNorth || candidate.isIndependentCastriesCentral;
  
  const displayParty = isIndependent ? { name: 'Independent', acronym: 'IND', color: '#808080' } : party;
  const displayLogoUrl = isIndependent ? (independentLogo?.logoUrl || currentElection?.independentLogoUrl) : party?.logoUrl;


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
                <div className="flex items-center gap-4 pt-2">
                    {displayParty && (
                    <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 flex-shrink-0">
                            {displayLogoUrl ? (
                                <Image src={displayLogoUrl} alt={`${displayParty.name} logo`} fill className="object-contain" />
                            ) : (
                                <Shield className="w-8 h-8 text-muted-foreground" />
                            )}
                        </div>
                        <span className="font-semibold" style={{ color: displayParty.color }}>
                        {displayParty.name} {displayParty.acronym && `(${displayParty.acronym})`}
                        </span>
                    </div>
                    )}
                    {candidate.facebookUrl && (
                        <Button asChild variant="ghost" size="icon">
                            <a href={candidate.facebookUrl} target="_blank" rel="noopener noreferrer">
                                <Facebook className="h-6 w-6 text-[#1877F2]" />
                            </a>
                        </Button>
                    )}
                </div>
            </div>
            </div>
        </CardHeader>

        <CardContent className="space-y-6 text-sm px-6">
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

            {reels && reels.length > 0 && (
                <div className="pt-6">
                    <h4 className="font-semibold text-base mb-2 uppercase tracking-wider text-muted-foreground">Social Media Reels</h4>
                     <Carousel
                        opts={{
                            align: "start",
                        }}
                        className="w-full"
                        >
                        <CarouselContent>
                            {reels.map((reel) => (
                            <CarouselItem key={reel.id} className="md:basis-1/2 lg:basis-1/3">
                                <div className="p-1">
                                <Card>
                                    <CardHeader className="p-4">
                                    <CardTitle className="text-base">
                                        <Link href={reel.authorUrl} target="_blank" className="hover:underline">{reel.authorName}</Link>
                                    </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 aspect-[9/16] overflow-hidden">
                                    <iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(reel.postUrl)}&show_text=false&width=560`} width="100%" height="100%" style={{border:'none', overflow:'hidden'}} allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
                                    </CardContent>
                                </Card>
                                </div>
                            </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden sm:flex" />
                        <CarouselNext className="hidden sm:flex" />
                        </Carousel>
                </div>
            )}
        </CardContent>
        </ScrollArea>
    </Card>
    </div>
  );
}
