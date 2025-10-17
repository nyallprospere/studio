
'use client';

import type { Candidate, Party, Constituency } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { UserSquare, Shield } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';

interface CandidateProfileDialogProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CandidateProfileDialog({ candidate, isOpen, onClose }: CandidateProfileDialogProps) {
  const { firestore } = useFirebase();

  const partyRef = useMemoFirebase(() => (firestore && candidate ? doc(firestore, 'parties', candidate.partyId) : null), [firestore, candidate]);
  const { data: party } = useDoc<Party>(partyRef);

  const constituencyRef = useMemoFirebase(() => (firestore && candidate ? doc(firestore, 'constituencies', candidate.constituencyId) : null), [firestore, candidate]);
  const { data: constituency } = useDoc<Constituency>(constituencyRef);

  if (!candidate) {
    return null;
  }

  const candidateName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[70vh]">
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
                <CardTitle className="font-headline text-3xl">{candidateName}</CardTitle>
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
                    <h4 className="font-semibold text-base mb-1 uppercase tracking-wider text-muted-foreground">About the Candidate</h4>
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

            {candidate.isIncumbent && <p className="font-bold text-primary mt-4">This candidate is an incumbent.</p>}
          </CardContent>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Minimal CardHeader and CardContent components for structure if not globally available
const CardHeader = (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />;
const CardContent = (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />;
const CardTitle = (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />;
const CardDescription = (props: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props} />;

