
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ui/chart';

const politicalLeaningOptions = [
    { value: 'solid-uwp', label: 'Solid UWP', color: 'fill-yellow-500' },
    { value: 'lean-uwp', label: 'Lean UWP', color: 'fill-yellow-300' },
    { value: 'tossup', label: 'Tossup', color: 'fill-purple-500' },
    { value: 'lean-slp', label: 'Lean SLP', color: 'fill-red-400' },
    { value: 'solid-slp', label: 'Solid SLP', color: 'fill-red-700' },
];

const makeYourOwnLeaningOptions = [
    { value: 'slp', label: 'SLP' },
    { value: 'uwp', label: 'UWP' },
    { value: 'ind', label: 'IND' },
    { value: 'unselected', label: 'To be selected' },
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
    const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate(s) N/A';

    const votePercentage = totalVotes && votes ? (votes / totalVotes) * 100 : 0;

    return (
        <>
             <div className={cn(
                "p-2 rounded-md bg-muted relative h-full flex flex-col items-center gap-2 text-center"
            )}>
                {isWinner && (
                    <div className="absolute -top-3 right-0 text-center">
                         <p className="font-bold text-xs -mb-5" style={{color: statusColor}}>{electionStatus}</p>
                        
                    </div>
                )}
                
                <div className="flex w-full items-center gap-2">
                    <div className={cn("relative w-20 flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-md", isWinner && "ring-2 ring-green-500")}>
                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-transparent">
                            {candidate?.imageUrl ? (
                                <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                            ) : (
                                <UserSquare className="h-full w-full text-gray-400" />
                            )}
                        </div>
                         <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold whitespace-normal leading-tight" onClick={() => setProfileOpen(true)} disabled={!candidate}>
                           {candidateName}
                        </Button>
                        {isWinner && <CheckCircle2 className="h-4 w-4 text-green-600 absolute top-[-4px] right-[-4px] bg-white rounded-full" />}
                    </div>

                     <div className="flex-grow flex flex-col items-center gap-2">
                        <div className="relative h-10 w-10">
                            {logoUrl ? (
                                <Image src={logoUrl} alt={party?.name || ''} fill className="object-contain" />
                            ) : null}
                        </div>
                        <div className="relative w-full h-8 bg-gray-200 rounded overflow-hidden self-center">
                            <div 
                                className={cn("absolute top-0 left-0 h-full rounded", isStriped && barFill === 'blue-red-stripes' && 'bg-blue-600')}
                                style={{ width: `${votePercentage}%`, backgroundColor: (isStriped && barFill === 'blue-red-stripes') ? '' : party?.color }}
                            >
                                {isStriped && barFill === 'blue-red-stripes' && <div className="absolute inset-0 red-stripes-overlay"></div>}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-between px-2">
                                <span className={cn(
                                    "font-bold text-xs",
                                    party?.acronym === 'SLP' ? 'text-white' : 'text-green-600'
                                )}>
                                    {votes?.toLocaleString()}
                                    {isWinner && margin ? <sup className="font-semibold"> (+{margin.toLocaleString()})</sup> : null}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold text-xs text-black">
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
                </div>

                {candidate?.isIncumbent && (
                    <div className="absolute top-1 right-2 text-xs font-semibold text-muted-foreground">
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
    previousElection,
    partyLogos,
    isMakeYourOwn
}: { 
    constituency: Constituency,
    election?: Election | null;
    onLeaningChange?: (leaning: string) => void;
    onPredictionChange?: (slp: number, uwp: number) => void;
    electionResults?: ElectionResult[];
    previousElectionResults?: ElectionResult[];
    previousElection?: Election | null;
    partyLogos?: PartyLogo[];
    isMakeYourOwn?: boolean;
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

    const { slpCandidate, uwpCandidate, independentCandidate, slpParty, uwpParty } = useMemo(() => {
        if (!parties || !candidates) {
            return { slpCandidate: null, uwpCandidate: null, independentCandidate: null, slpParty: null, uwpParty: null };
        }
        const slp = parties.find(p => p.acronym === 'SLP');
        const uwp = parties.find(p => p.acronym === 'UWP');

        let slpCand = slp ? candidates.find(c => c.partyId === slp.id) : null;
        const uwpCand = uwp ? candidates.find(c => c.partyId === uwp.id) : null;
        
        let indCand = null;
        
        if (election?.year === 2021) {
            if (constituency.name === 'Castries North') {
                indCand = slpCand; // Stephenson King ran on SLP ticket in 2021 results data, but was independent
                slpCand = null; // No official SLP candidate
            } else if (constituency.name === 'Castries Central') {
                indCand = slpCand; // Richard Frederick, same situation
                slpCand = null;
            }
        } else if (election?.isCurrent) {
             indCand = candidates.find(c => (c as Candidate).isIndependentCastriesNorth || (c as Candidate).isIndependentCastriesCentral);
        } else {
             indCand = candidates.find(c => c.partyId !== slp?.id && c.partyId !== uwp?.id);
        }

        return { slpCandidate: slpCand, uwpCandidate: uwpCand, independentCandidate: indCand, slpParty: slp, uwpParty: uwp };
    }, [parties, candidates, constituency.name, election]);


    const { electionStatus, statusColor, margin, totalConstituencyVotes, winnerAcronym, slpVotePercentageChange, uwpVotePercentageChange, otherVotePercentageChange, slpLogoUrl, uwpLogoUrl, indLogoUrl, indVotes } = useMemo(() => {
        if (!electionResults || !slpParty || !uwpParty) return { electionStatus: null, statusColor: undefined, margin: null, totalConstituencyVotes: 0, winnerAcronym: null, slpVotePercentageChange: null, uwpVotePercentageChange: null, otherVotePercentageChange: null, slpLogoUrl: null, uwpLogoUrl: null, indLogoUrl: null, indVotes: 0 };

        const currentResult = electionResults.find(r => r.constituencyId === constituency.id);
        
        if (!currentResult) return { electionStatus: null, statusColor: undefined, margin: null, totalConstituencyVotes: 0, winnerAcronym: null, slpVotePercentageChange: null, uwpVotePercentageChange: null, otherVotePercentageChange: null, slpLogoUrl: null, uwpLogoUrl: null, indLogoUrl: null, indVotes: 0 };
        
        const totalVotes = currentResult.totalVotes;
        const isSpecial2021Constituency = election?.year === 2021 && (constituency.name === 'Castries North' || constituency.name === 'Castries Central');

        const indVotes = isSpecial2021Constituency ? currentResult.slpVotes : currentResult.otherVotes;
        const slpVotes = isSpecial2021Constituency ? 0 : currentResult.slpVotes;
        const uwpVotes = currentResult.uwpVotes;
        
        let winnerAcronym = '';
        let margin = 0;

        if (indVotes > uwpVotes && indVotes > slpVotes) {
            winnerAcronym = 'IND';
            margin = indVotes - Math.max(uwpVotes, slpVotes);
        } else if (slpVotes > uwpVotes) {
            winnerAcronym = 'SLP';
            margin = slpVotes - uwpVotes;
        } else if (uwpVotes > slpVotes) {
            winnerAcronym = 'UWP';
            margin = uwpVotes - slpVotes;
        }

        let status = `${''}${winnerAcronym} Win`;
        let color = winnerAcronym === 'UWP' ? '#D4AC0D' : winnerAcronym === 'SLP' ? slpParty.color : '#3b82f6';

        let slpVotePercentageChange = null;
        let uwpVotePercentageChange = null;
        let otherVotePercentageChange = null;

        if (previousElectionResults && previousElection) {
            const previousResult = previousElectionResults.find(r => r.constituencyId === constituency.id);
            if (previousResult) {
                const prevIsSpecial2021Constituency = previousElection.year === 2021 && (constituency.name === 'Castries North' || constituency.name === 'Castries Central');
                const prevIndVotes = prevIsSpecial2021Constituency ? previousResult.slpVotes : previousResult.otherVotes;
                const prevSlpVotes = prevIsSpecial2021Constituency ? 0 : previousResult.slpVotes;

                let previousWinnerAcronym = '';
                if (prevIndVotes > previousResult.uwpVotes && prevIndVotes > prevSlpVotes) {
                    previousWinnerAcronym = 'IND';
                } else if (prevSlpVotes > previousResult.uwpVotes) {
                    previousWinnerAcronym = 'SLP';
                } else {
                    previousWinnerAcronym = 'UWP';
                }
                
                if (winnerAcronym === previousWinnerAcronym) {
                    status = `${winnerAcronym} Hold`;
                } else {
                    status = `${winnerAcronym} Gain`;
                }

                if (totalVotes > 0) {
                    const currentSlpPercent = (slpVotes / totalVotes) * 100;
                    const currentUwpPercent = (uwpVotes / totalVotes) * 100;
                    const currentIndPercent = (indVotes / totalVotes) * 100;

                    const prevTotalVotes = previousResult.totalVotes;
                    if (prevTotalVotes > 0) {
                        const prevSlpPercent = (prevSlpVotes / prevTotalVotes) * 100;
                        const prevUwpPercent = (previousResult.uwpVotes / prevTotalVotes) * 100;
                        const prevIndPercent = (prevIndVotes / prevTotalVotes) * 100;
                        
                        slpVotePercentageChange = currentSlpPercent - prevSlpPercent;
                        uwpVotePercentageChange = currentUwpPercent - prevUwpPercent;
                        otherVotePercentageChange = currentIndPercent - prevIndPercent;
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
        
        const independentLogo = partyLogos?.find(logo => logo.partyId === 'independent' && logo.electionId === election?.id && logo.constituencyId === constituency.id);

        return { 
            electionStatus: status, 
            statusColor: color, 
            margin: margin, 
            totalConstituencyVotes: totalVotes, 
            winnerAcronym, 
            slpVotePercentageChange, 
            uwpVotePercentageChange,
            otherVotePercentageChange,
            slpLogoUrl: getLogo(slpParty.id),
            uwpLogoUrl: getLogo(uwpParty.id),
            indLogoUrl: independentCandidate?.customLogoUrl || independentLogo?.logoUrl || election?.independentLogoUrl,
            indVotes,
        };

    }, [constituency.id, electionResults, previousElectionResults, previousElection, slpParty, uwpParty, partyLogos, election, parties, independentCandidate]);


    const isLoading = loadingCandidates || loadingParties;
    const currentResult = electionResults?.find(r => r.constituencyId === constituency.id);
    const uwpIsWinner = winnerAcronym === 'UWP';
    const otherIsWinner = winnerAcronym === 'IND';
    const slpIsWinner = !uwpIsWinner && !otherIsWinner;

    const isSpecialConstituency = election?.year === 2021 && (constituency.name === 'Castries North' || constituency.name === 'Castries Central');
    const isMakeYourOwnSpecial = isMakeYourOwn && (constituency.name === 'Castries North' || constituency.name === 'Castries Central');
    const makeYourOwnOptions = useMemo(() => {
        let options = makeYourOwnLeaningOptions.filter(o => o.value === 'slp' || o.value === 'uwp' || o.value === 'unselected');
        if (isMakeYourOwnSpecial) {
            options.splice(2, 0, { value: 'ind', label: 'IND' });
        }
        return options;
    }, [isMakeYourOwnSpecial]);

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }

    return (
        <div className="space-y-3 w-80">
            <h4 className="font-bold leading-none text-center text-xl flex items-center justify-center gap-2">
                {constituency.logoUrl && <Image src={constituency.logoUrl} alt={constituency.name} width={24} height={24} />}
                {constituency.name}
            </h4>
            
            {(election?.isCurrent || !election) && !isMakeYourOwn ? (
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
                            {slpCandidate ? `${slpCandidate.firstName} ${slpCandidate.lastName}` : 'Candidate(s) N/A'}
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
                            {uwpCandidate ? `${uwpCandidate.firstName} ${uwpCandidate.lastName}` : 'Candidate(s) N/A'}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : !isMakeYourOwn ? (
              <div className="space-y-2">
                   {!isSpecialConstituency && slpCandidate && (
                    <CandidateBox 
                        candidate={slpCandidate} 
                        party={slpParty} 
                        isWinner={slpIsWinner} 
                        votes={currentResult?.slpVotes} 
                        totalVotes={totalConstituencyVotes}
                        margin={margin}
                        electionStatus={electionStatus}
                        statusColor={statusColor}
                        votePercentageChange={slpVotePercentageChange}
                        logoUrl={slpLogoUrl}
                    />
                   )}
                  <CandidateBox 
                      candidate={uwpCandidate} 
                      party={uwpParty} 
                      isWinner={uwpIsWinner} 
                      votes={currentResult?.uwpVotes}
                      totalVotes={totalConstituencyVotes}
                      margin={margin}
                      electionStatus={electionStatus}
                      statusColor={statusColor}
                      votePercentageChange={uwpVotePercentageChange}
                      logoUrl={uwpLogoUrl}
                  />
                  {(isSpecialConstituency || (currentResult?.otherVotes || 0) > 0) && (
                      <CandidateBox 
                          candidate={independentCandidate}
                          party={null}
                          isWinner={otherIsWinner}
                          votes={indVotes}
                          totalVotes={totalConstituencyVotes}
                          margin={margin}
                          electionStatus={electionStatus}
                          statusColor={statusColor}
                          votePercentageChange={otherVotePercentageChange}
                          logoUrl={indLogoUrl}
                      />
                  )}
              </div>
            ) : null}
            
            {onLeaningChange && isMakeYourOwn && (
                <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-medium text-muted-foreground">Choose Your Pick</h5>
                     <RadioGroup 
                        value={constituency.politicalLeaning} 
                        onValueChange={onLeaningChange}
                        className={cn("grid gap-1", makeYourOwnOptions.length === 3 ? "grid-cols-3" : "grid-cols-2")}
                    >
                        {makeYourOwnOptions.map(opt => {
                            if (opt.value === 'unselected') return null;
                            return (
                                <Label 
                                    key={opt.value} 
                                    htmlFor={`${constituency.id}-${opt.value}`}
                                    className={cn(
                                        "flex-1 text-center border rounded-md px-2 py-1 text-xs font-medium cursor-pointer transition-colors",
                                        constituency.politicalLeaning === opt.value 
                                            ? "bg-primary text-primary-foreground" 
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <RadioGroupItem value={opt.value} id={`${constituency.id}-${opt.value}`} className="sr-only" />
                                    {opt.label}
                                </Label>
                            )
                        })}
                    </RadioGroup>
                </div>
            )}
            {onLeaningChange && !isMakeYourOwn && (
                <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-medium text-muted-foreground">Choose Your Pick</h5>
                     <RadioGroup 
                        value={constituency.politicalLeaning} 
                        onValueChange={onLeaningChange}
                        className="grid grid-cols-5 gap-1"
                    >
                        {politicalLeaningOptions.map(opt => (
                            <Label 
                                key={opt.value} 
                                htmlFor={`${constituency.id}-${opt.value}`}
                                className={cn(
                                    "flex-1 text-center border rounded-md px-2 py-1 text-xs font-medium cursor-pointer transition-colors",
                                    constituency.politicalLeaning === opt.value 
                                        ? "bg-primary text-primary-foreground" 
                                        : "hover:bg-muted"
                                )}
                            >
                                <RadioGroupItem value={opt.value} id={`${constituency.id}-${opt.value}`} className="sr-only" />
                                {opt.label}
                            </Label>
                        ))}
                    </RadioGroup>
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

    
