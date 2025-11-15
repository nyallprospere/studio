

'use client';

import type { Candidate, Party, Constituency, Reel } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { UserSquare, Shield, Facebook, Instagram } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Link from 'next/link';

interface CandidateProfileDialogProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CandidateProfileDialog({ candidate, isOpen, onClose }: CandidateProfileDialogProps) {
  const { firestore } = useFirebase();

  const partyRef = useMemoFirebase(() => (firestore && candidate && candidate.partyId ? doc(firestore, 'parties', candidate.partyId) : null), [firestore, candidate]);
  const { data: party } = useDoc<Party>(partyRef);

  const constituencyRef = useMemoFirebase(() => (firestore && candidate && candidate.constituencyId ? doc(firestore, 'constituencies', candidate.constituencyId) : null), [firestore, candidate]);
  const { data: constituency } = useDoc<Constituency>(constituencyRef);

  const storiesQuery = useMemoFirebase(() => {
    if (!firestore || !candidate) return null;
    return query(collection(firestore, 'stories'), where('candidateId', '==', candidate.id));
  }, [firestore, candidate]);
  const { data: stories } = useCollection<Reel>(storiesQuery);


  if (!candidate) {
    return null;
  }

  const candidateName = `${candidate.firstName} ${candidate.lastName}`;
  const displayName = `${candidateName}`;
  const isIndependent = candidate.isIndependentCastriesCentral || candidate.isIndependentCastriesNorth || !candidate.partyId;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[70vh]">
        <ScrollArea className="h-full pr-6">
          <DialogHeader className="mb-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="relative h-32 w-32 flex-shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {candidate.imageUrl ? (
                  <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                ) : (
                  <UserSquare className="h-full w-full text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <DialogTitle className="font-headline text-3xl">{displayName}</DialogTitle>
                {constituency && (
                    <DialogDescription className="text-lg">
                    Candidate for <span className="font-semibold text-foreground">{constituency.name}</span>
                    {candidate.isIncumbent && <span className="font-normal text-primary text-sm ml-2">(Incumbent)</span>}
                    </DialogDescription>
                )}
                <div className="flex items-center gap-4 pt-2">
                    {isIndependent ? (
                        <div className="flex items-center gap-2">
                            <Shield className="w-8 h-8 text-muted-foreground" />
                            <span className="font-semibold">Independent</span>
                        </div>
                    ) : party && (
                    <div className="flex items-center gap-2">
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
                    {candidate.facebookUrl && (
                        <Button asChild variant="outline" size="icon">
                            <a href={candidate.facebookUrl} target="_blank" rel="noopener noreferrer">
                                <Facebook className="h-4 w-4" />
                            </a>
                        </Button>
                    )}
                    {candidate.instagramUrl && (
                        <Button asChild variant="outline" size="icon">
                            <a href={candidate.instagramUrl} target="_blank" rel="noopener noreferrer">
                                <Instagram className="h-4 w-4" />
                            </a>
                        </Button>
                    )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 text-sm px-6">
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

            {stories && stories.length > 0 && (
                <div className="pt-6">
                    <h4 className="font-semibold text-base mb-2 uppercase tracking-wider text-muted-foreground">Social Media Stories</h4>
                     <Carousel
                        opts={{
                            align: "start",
                        }}
                        className="w-full"
                        >
                        <CarouselContent>
                            {stories.map((story) => (
                            <CarouselItem key={story.id} className="md:basis-1/2 lg:basis-1/3">
                                <div className="p-1">
                                <Card>
                                    <CardHeader className="p-4">
                                    <CardTitle className="text-base">
                                        <Link href={story.authorUrl} target="_blank" className="hover:underline">{story.authorName}</Link>
                                    </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 aspect-[9/16] overflow-hidden">
                                    <iframe src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(story.postUrl)}&show_text=true&width=500`} width="100%" height="100%" style={{border:'none', overflow:'hidden'}} scrolling="no" frameBorder="0" allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
