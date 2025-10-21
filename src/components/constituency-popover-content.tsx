
'use client';

import { useMemo, useState } from 'react';
import type { Constituency, Candidate, Party, ArchivedCandidate, ElectionResult, Election } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';
import { UserSquare, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { CandidateProfileDialog } from './candidate-profile-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';

const politicalLeaningOptions = [
    { value: 'solid-uwp', label: 'Solid UWP' },
    { value: 'lean-uwp', label: 'Lean UWP' },
    { value: 'tossup', label: 'Tossup' },
    { value: 'lean-slp', label: 'Lean SLP' },
    { value: 'solid-slp', label: 'Solid SLP' },
];

const getLeaningLabel = (leaningValue?: string) => {
    return politicalLeaningOptions.find(opt => opt.value === leaningValue)?.label || 'Tossup';
};

function CandidateBox({ candidate, party, isWinner, votes, totalVotes, margin, electionStatus, statusColor }: { 
    candidate: Candidate | ArchivedCandidate | null;
    party: Party | null;
    isWinner: boolean;
    votes?: number;
    totalVotes?: number;
    margin?: number | null;
    electionStatus?: string | null;
    statusColor?: string | undefined;
}) {
    const [isProfileOpen, setProfileOpen] = useState(false);
    const isIncumbent = candidate?.isIncumbent;
    const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}${isIncumbent ? '*' : ''}` : 'Candidate TBD';

    const votePercentage = totalVotes && votes ? (votes / totalVotes) * 100 : 0;

    return (
        <>
            <div className={cn(
                "p-2 rounded-md bg-muted relative h-full flex flex-col",
                isWinner && "border-2 border-green-600"
            )}>
                 {isWinner && <CheckCircle2 className="absolute -top-2 -right-2 h-5 w-5 text-green-600 bg-white rounded-full" />}
                
                <div className="flex items-center justify-between gap-2 mb-2">
                    {party?.logoUrl && (
                        <div className="relative h-10 w-10">
                            <Image src={party.logoUrl} alt={party.name} fill className="object-contain" />
                        </div>
                    )}
                    <div className="flex flex-col items-center">
                            <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-200">
                            {candidate?.imageUrl ? (
                                <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                            ) : (
                                <UserSquare className="h-full w-full text-gray-400" />
                            )}
                        </div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold" onClick={() => setProfileOpen(true)} disabled={!candidate}>
                            {candidateName}
                        </Button>
                    </div>
                    <div className="flex-grow text-center">
                        <p className="font-bold text-xs" style={{color: statusColor}}>{electionStatus}</p>
                    </div>
                </div>

                <div className="relative w-full h-8 bg-gray-200 rounded overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full rounded" 
                        style={{ width: `${votePercentage}%`, backgroundColor: party?.color }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-start px-2">
                        <span className="text-white font-bold text-sm">
                            {votes !== undefined && votes.toLocaleString()}
                        </span>
                        {isWinner && margin !== null && (
                            <span className="text-black text-[11px] font-bold ml-1">
                                (+{margin.toLocaleString()})
                            </span>
                        )}
                    </div>
                </div>

            </div>
            {candidate && <CandidateProfileDialog candidate={candidate as Candidate} isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />}
        </>
    );
}


export function ConstituencyPopoverContent({ 
    constituency, 
    election,
    onLeaningChange,
    onPredictionChange,
    electionResults,
    previousElectionResults
}: { 
    constituency: Constituency,
    election?: Election | null;
    onLeaningChange?: (leaning: string) => void;
    onPredictionChange?: (slp: number, uwp: number) => void;
    electionResults?: ElectionResult[];
    previousElectionResults?: ElectionResult[];
}) {
    const { firestore } = useFirebase();

    const candidatesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        if (election) {
            return query(
                collection(firestore, 'archived_candidates'),
                where('constituencyId', '==', constituency.id),
                where('electionId', '==', election.id)
            );
        }
        return query(collection(firestore, 'candidates'), where('constituencyId', '==', constituency.id));
    }, [firestore, constituency.id, election]);

    const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate | ArchivedCandidate>(candidatesQuery);

    const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
    const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

    const { slpCandidate, uwpCandidate, slpParty, uwpParty } = useMemo(() => {
        if (!parties || !candidates) {
            return { slpCandidate: null, uwpCandidate: null, slpParty: null, uwpParty: null };
        }
        const slp = parties.find(p => p.acronym === 'SLP');
        const uwp = parties.find(p => p.acronym === 'UWP');

        const slpCand = slp ? candidates.find(c => c.partyId === slp.id) : null;
        const uwpCand = uwp ? candidates.find(c => c.partyId === uwp.id) : null;

        return { slpCandidate: slpCand, uwpCandidate: uwpCand, slpParty: slp, uwpParty: uwp };
    }, [parties, candidates]);


    const { electionStatus, statusColor, margin, totalConstituencyVotes } = useMemo(() => {
        if (!electionResults) return { electionStatus: null, statusColor: undefined, margin: null, totalConstituencyVotes: 0 };

        const currentResult = electionResults.find(r => r.constituencyId === constituency.id);
        
        if (!currentResult) return { electionStatus: null, statusColor: undefined, margin: null, totalConstituencyVotes: 0 };
        
        const totalVotes = currentResult.slpVotes + currentResult.uwpVotes + currentResult.otherVotes;
        const margin = Math.abs(currentResult.slpVotes - currentResult.uwpVotes);
        const currentWinner = currentResult.slpVotes > currentResult.uwpVotes ? slpParty : uwpParty;
        let status = `${currentWinner?.acronym} Win`;
        let color = currentWinner?.color;

        if (previousElectionResults) {
            const previousResult = previousElectionResults.find(r => r.constituencyId === constituency.id);
            if (previousResult) {
                const previousWinnerAcronym = previousResult.slpVotes > previousResult.uwpVotes ? 'SLP' : 'UWP';
                if (currentWinner?.acronym === previousWinnerAcronym) {
                    status = `${currentWinner?.acronym} Hold`;
                } else {
                    status = `${currentWinner?.acronym} Gain`;
                    color = currentWinner?.color;
                }
            }
        }
        
        return { electionStatus: status, statusColor: color, margin: margin, totalConstituencyVotes: totalVotes };

    }, [constituency.id, electionResults, previousElectionResults, slpParty, uwpParty]);


    const isLoading = loadingCandidates || loadingParties;
    const currentResult = electionResults?.find(r => r.constituencyId === constituency.id);
    const winnerAcronym = currentResult ? (currentResult.slpVotes > currentResult.uwpVotes ? 'SLP' : 'UWP') : null;


    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }

    return (
        <div className="space-y-3">
            <h4 className="font-bold leading-none text-center text-xl">{constituency.name}</h4>
            
            <div className="space-y-2">
                <CandidateBox 
                    candidate={slpCandidate!} 
                    party={slpParty!} 
                    isWinner={winnerAcronym === 'SLP'} 
                    votes={currentResult?.slpVotes} 
                    totalVotes={totalConstituencyVotes}
                    margin={margin}
                    electionStatus={electionStatus}
                    statusColor={statusColor}
                />
                <CandidateBox 
                    candidate={uwpCandidate!} 
                    party={uwpParty!} 
                    isWinner={winnerAcronym === 'UWP'} 
                    votes={currentResult?.uwpVotes}
                    totalVotes={totalConstituencyVotes}
                    margin={margin}
                    electionStatus={electionStatus}
                    statusColor={statusColor}
                />
            </div>
            
            {onLeaningChange && (
                <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-medium text-muted-foreground">Edit Leaning</h5>
                     <Select value={constituency.politicalLeaning} onValueChange={onLeaningChange}>
                        <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Select leaning" />
                        </SelectTrigger>
                        <SelectContent>
                            {politicalLeaningOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {onPredictionChange && (
                 <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-medium text-muted-foreground">Edit Prediction</h5>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{color: slpParty?.color}}>SLP: {constituency.predictedSlpPercentage}%</span>
                        <Slider
                            value={[constituency.predictedSlpPercentage || 50]}
                            onValueChange={(value) => onPredictionChange(value[0], 100 - value[0])}
                            max={100}
                            step={1}
                        />
                        <span className="text-xs font-semibold" style={{color: uwpParty?.color}}>UWP: {constituency.predictedUwpPercentage}%</span>
                    </div>
                 </div>
            )}
        </div>
    );
}
