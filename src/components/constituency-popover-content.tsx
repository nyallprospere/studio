
'use client';

import { useMemo, useState } from 'react';
import type { Constituency, Candidate, Party, ArchivedCandidate, ElectionResult, Election, PartyLogo } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';
import { UserSquare, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './ui/button';
import { CandidateProfileDialog } from './candidate-profile-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ui/chart';

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

function CandidateBox({ 
    candidate, 
    party, 
    isWinner, 
    votes, 
    totalVotes, 
    margin, 
    electionStatus, 
    statusColor, 
    isStriped, 
    barFill, 
    votePercentageChange,
    logoUrl
}: { 
    candidate: Candidate | ArchivedCandidate | null;
    party: Party | null;
    isWinner: boolean;
    votes?: number;
    totalVotes?: number;
    margin?: number | null;
    electionStatus?: string | null;
    statusColor?: string | undefined;
    isStriped?: boolean;
    barFill?: string;
    votePercentageChange?: number | null;
    logoUrl?: string;
}) {
    const [isProfileOpen, setProfileOpen] = useState(false);
    const isIncumbent = candidate?.isIncumbent;
    const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate TBD';

    const votePercentage = totalVotes && votes ? (votes / totalVotes) * 100 : 0;
    const textColorClass = party?.acronym === 'SLP' ? 'text-white' : 'text-black';

    return (
        <>
             <div className={cn(
                "p-2 rounded-md bg-muted relative h-full flex flex-col items-center gap-2 text-center",
                isWinner && "border-2 border-green-600"
            )}>
                 {isWinner && (
                    <div className="absolute -top-3 -right-2 text-center">
                         <p className="font-bold text-xs -mb-2" style={{color: statusColor}}>{electionStatus}</p>
                        <CheckCircle2 className="h-5 w-5 text-green-600 bg-white rounded-full mx-auto" />
                    </div>
                )}
                
                <div className="flex w-full items-center gap-2">
                    <div className="w-20 flex-shrink-0 flex flex-col items-center gap-1">
                        <div className="relative h-10 w-10">
                            {logoUrl ? (
                                <Image src={logoUrl} alt={party?.name || ''} fill className="object-contain" />
                            ) : null}
                        </div>
                        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-transparent">
                        {candidate?.imageUrl ? (
                            <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                        ) : (
                            <UserSquare className="h-full w-full text-gray-400" />
                        )}
                        </div>
                         <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold whitespace-nowrap" onClick={() => setProfileOpen(true)} disabled={!candidate}>
                           {candidateName}
                        </Button>
                    </div>

                    <div className="relative w-full h-8 bg-gray-200 rounded overflow-hidden self-center">
                        <div 
                            className={cn("absolute top-0 left-0 h-full rounded", isStriped && barFill === 'blue-red-stripes' && 'bg-blue-600')}
                            style={{ width: `${votePercentage}%`, backgroundColor: (isStriped && barFill === 'blue-red-stripes') ? '' : party?.color }}
                        >
                            {isStriped && barFill === 'blue-red-stripes' && <div className="absolute inset-0 red-stripes-overlay"></div>}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                             <span className={cn("font-bold text-xs", textColorClass)}>
                                {votes?.toLocaleString()}
                                {isWinner && margin ? <sup className="font-semibold"> (+{margin.toLocaleString()})</sup> : null}
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className={cn("font-bold text-xs", party?.acronym === 'SLP' ? 'text-black' : textColorClass)}>
                                    {votePercentage.toFixed(1)}%
                                </span>
                                {votePercentageChange !== null && typeof votePercentageChange !== 'undefined' && (
                                    <div className={cn("text-xs font-bold flex items-center", votePercentageChange > 0 ? 'text-green-700' : 'text-red-700')}>
                                        {votePercentageChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                        {Math.abs(votePercentageChange).toFixed(1)}%
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isIncumbent && (
                    <div className="absolute bottom-1 right-2 text-xs font-semibold text-muted-foreground">
                        Incumbent
                    </div>
                )}
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
    previousElectionResults,
    partyLogos
}: { 
    constituency: Constituency,
    election?: Election | null;
    onLeaningChange?: (leaning: string) => void;
    onPredictionChange?: (slp: number, uwp: number) => void;
    electionResults?: ElectionResult[];
    previousElectionResults?: ElectionResult[];
    partyLogos?: PartyLogo[];
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


    const { electionStatus, statusColor, margin, totalConstituencyVotes, winnerAcronym, slpVotePercentageChange, uwpVotePercentageChange, slpLogoUrl, uwpLogoUrl } = useMemo(() => {
        if (!electionResults || !slpParty || !uwpParty) return { electionStatus: null, statusColor: undefined, margin: null, totalConstituencyVotes: 0, winnerAcronym: null, slpVotePercentageChange: null, uwpVotePercentageChange: null, slpLogoUrl: null, uwpLogoUrl: null };

        const currentResult = electionResults.find(r => r.constituencyId === constituency.id);
        
        if (!currentResult) return { electionStatus: null, statusColor: undefined, margin: null, totalConstituencyVotes: 0, winnerAcronym: null, slpVotePercentageChange: null, uwpVotePercentageChange: null, slpLogoUrl: null, uwpLogoUrl: null };
        
        const totalVotes = currentResult.slpVotes + currentResult.uwpVotes + currentResult.otherVotes;
        const margin = Math.abs(currentResult.slpVotes - currentResult.uwpVotes);
        const currentWinner = currentResult.slpVotes > currentResult.uwpVotes ? slpParty : uwpParty;
        const winnerAcronym = currentWinner?.acronym;
        let status = `${winnerAcronym} Win`;
        let color = currentWinner?.color;

        let slpVotePercentageChange = null;
        let uwpVotePercentageChange = null;

        if (previousElectionResults) {
            const previousResult = previousElectionResults.find(r => r.constituencyId === constituency.id);
            if (previousResult) {
                const previousWinnerAcronym = previousResult.slpVotes > previousResult.uwpVotes ? 'SLP' : 'UWP';
                if (winnerAcronym === previousWinnerAcronym) {
                    status = `${winnerAcronym} Hold`;
                } else {
                    status = `${winnerAcronym} Gain`;
                    color = currentWinner?.color;
                }
                if (totalVotes > 0) {
                    const currentSlpPercent = (currentResult.slpVotes / totalVotes) * 100;
                    const currentUwpPercent = (currentResult.uwpVotes / totalVotes) * 100;
                    const prevTotalVotes = previousResult.slpVotes + previousResult.uwpVotes + previousResult.otherVotes;
                    if (prevTotalVotes > 0) {
                        const prevSlpPercent = (previousResult.slpVotes / prevTotalVotes) * 100;
                        const prevUwpPercent = (previousResult.uwpVotes / prevTotalVotes) * 100;
                        slpVotePercentageChange = currentSlpPercent - prevSlpPercent;
                        uwpVotePercentageChange = currentUwpPercent - prevUwpPercent;
                    }
                }
            }
        }
        
        const getLogo = (partyId: string) => {
            const electionLogo = partyLogos?.find(logo => logo.partyId === partyId && logo.electionId === election?.id);
            const party = parties?.find(p => p.id === partyId);

            let logoUrl = electionLogo?.logoUrl || party?.logoUrl;
            if (election && election.year < 1997) {
                logoUrl = party?.oldLogoUrl || logoUrl;
            }
            return logoUrl;
        }


        return { 
            electionStatus: status, 
            statusColor: color, 
            margin: margin, 
            totalConstituencyVotes: totalVotes, 
            winnerAcronym, 
            slpVotePercentageChange, 
            uwpVotePercentageChange,
            slpLogoUrl: getLogo(slpParty.id),
            uwpLogoUrl: getLogo(uwpParty.id),
        };

    }, [constituency.id, electionResults, previousElectionResults, slpParty, uwpParty, partyLogos, election, parties]);


    const isLoading = loadingCandidates || loadingParties;
    const currentResult = electionResults?.find(r => r.constituencyId === constituency.id);
    const slpIsWinner = winnerAcronym === 'SLP';
    const uwpIsWinner = winnerAcronym === 'UWP';

    const isCastriesNorth2021 = election?.year === 2021 && constituency.name === 'Castries North';
    const castriesNorthWinnerAcronym = isCastriesNorth2021 ? (currentResult && currentResult.slpVotes > currentResult.uwpVotes ? 'SLP' : 'UWP') : null;

    const predictionChartData = useMemo(() => {
      if (!slpParty || !uwpParty) return [];
      const slpPercent = constituency.predictedSlpPercentage || 50;
      const uwpPercent = constituency.predictedUwpPercentage || 50;
      return [
        { name: slpParty.acronym, value: slpPercent, fill: slpParty.color },
        { name: uwpParty.acronym, value: uwpPercent, fill: uwpParty.color },
      ];
    }, [constituency, slpParty, uwpParty]);

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }

    return (
        <div className="space-y-3">
            <h4 className="font-bold leading-none text-center text-xl">{constituency.name}</h4>
            
            {election?.isCurrent || !election ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex flex-col items-center p-2 rounded-md bg-muted">
                            <div className="relative h-8 w-8 mb-2">
                                {slpParty?.logoUrl ? (
                                    <Image src={slpParty.logoUrl} alt={slpParty.name} fill className="object-contain" />
                                ): null}
                            </div>
                            <div className="relative h-10 w-10 rounded-full overflow-hidden bg-transparent">
                            {slpCandidate?.imageUrl ? (
                                <Image src={slpCandidate.imageUrl} alt={slpCandidate?.name || 'SLP Candidate'} fill className="object-cover" />
                            ) : (
                                <UserSquare className="h-full w-full text-gray-400" />
                            )}
                            </div>
                            <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs font-semibold" disabled={!slpCandidate}>
                            {slpCandidate ? `${slpCandidate.firstName} ${slpCandidate.lastName}` : 'TBD'}
                            </Button>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-md bg-muted">
                            <div className="relative h-8 w-8 mb-2">
                                {uwpParty?.logoUrl ? (
                                    <Image src={uwpParty.logoUrl} alt={uwpParty.name} fill className="object-contain" />
                                ): null}
                            </div>
                            <div className="relative h-10 w-10 rounded-full overflow-hidden bg-transparent">
                            {uwpCandidate?.imageUrl ? (
                                <Image src={uwpCandidate.imageUrl} alt={uwpCandidate?.name || 'UWP Candidate'} fill className="object-cover" />
                            ) : (
                                <UserSquare className="h-full w-full text-gray-400" />
                            )}
                            </div>
                            <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs font-semibold" disabled={!uwpCandidate}>
                            {uwpCandidate ? `${uwpCandidate.firstName} ${uwpCandidate.lastName}` : 'TBD'}
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center text-center space-y-2 py-2">
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground">STATUS</p>
                            <p className="font-bold">{getLeaningLabel(constituency.politicalLeaning)}</p>
                        </div>
                         <ChartContainer config={{}} className="h-24 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={predictionChartData}
                                        dataKey="value"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius="60%"
                                        outerRadius="100%"
                                        cy="100%"
                                        paddingAngle={2}
                                    >
                                        {predictionChartData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </div>
            ) : (
              <div className="space-y-2">
                  <CandidateBox 
                      candidate={slpCandidate!} 
                      party={slpParty!} 
                      isWinner={slpIsWinner} 
                      votes={currentResult?.slpVotes} 
                      totalVotes={totalConstituencyVotes}
                      margin={margin}
                      electionStatus={electionStatus}
                      statusColor={statusColor}
                      isStriped={isCastriesNorth2021 && castriesNorthWinnerAcronym === 'SLP'}
                      barFill={isCastriesNorth2021 && castriesNorthWinnerAcronym === 'SLP' ? 'blue-red-stripes' : undefined}
                      votePercentageChange={slpVotePercentageChange}
                      logoUrl={slpLogoUrl}
                  />
                  <CandidateBox 
                      candidate={uwpCandidate!} 
                      party={uwpParty!} 
                      isWinner={uwpIsWinner} 
                      votes={currentResult?.uwpVotes}
                      totalVotes={totalConstituencyVotes}
                      margin={margin}
                      electionStatus={electionStatus}
                      statusColor={statusColor}
                      isStriped={isCastriesNorth2021 && castriesNorthWinnerAcronym === 'UWP'}
                      barFill={isCastriesNorth2021 && castriesNorthWinnerAcronym === 'UWP' ? 'blue-red-stripes' : undefined}
                      votePercentageChange={uwpVotePercentageChange}
                      logoUrl={uwpLogoUrl}
                  />
              </div>
            )}
            
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
