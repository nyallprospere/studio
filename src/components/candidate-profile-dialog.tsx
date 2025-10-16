
'use client';

import type { Candidate, Party, Constituency } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { UserSquare, Shield } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';

interface CandidateProfileDialogProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CandidateProfileDialog({ candidate, isOpen, onClose }: CandidateProfileDialogProps) {
  const { firestore } = useFirebase();

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);

  const { data: parties } = useCollection<Party>(partiesQuery);
  const { data: constituencies } = useCollection<Constituency>(constituenciesQuery);

  if (!candidate) {
    return null;
  }

  const party = parties?.find(p => p.id === candidate.partyId);
  const constituency = constituencies?.find(c => c.id === candidate.constituencyId);
  const candidateName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl h-[80vh]">
        <ScrollArea className="h-full pr-6">
          <DialogHeader className="mb-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="relative h-32 w-32 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                {candidate.imageUrl ? (
                  <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                ) : (
                  <UserSquare className="h-full w-full text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <DialogTitle className="font-headline text-3xl">{candidateName}</DialogTitle>
                <DialogDescription className="text-lg">
                  Candidate for <span className="font-semibold text-foreground">{constituency?.name}</span>
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

          <div className="space-y-6 text-sm">
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

            {candidate.isIncumbent && <p className="font-bold text-primary">This candidate is an incumbent.</p>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
