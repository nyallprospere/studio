
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
  const displayName = `${candidateName}`;


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
                  <span className="text-4xl font-bold text-gray-500">X</span>
                )}
              </div>
              <div className="space-y-1">
                <DialogTitle className="font-headline text-3xl">{displayName}</DialogTitle>
                <DialogDescription className="text-lg">
                  Candidate for <span className="font-semibold text-foreground">{constituency?.name}</span>
                  {candidate.isIncumbent && <span className="font-normal text-primary text-sm ml-2">(Incumbent)</span>}
                </DialogDescription>
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
