
'use client';

import { useMemo, useState } from 'react';
import type { Constituency, Candidate, Party, ArchivedCandidate, ElectionResult, Election, PartyLogo } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import type { ChartConfig } from './ui/chart';

const politicalLeaningOptions = [
    { value: 'solid-uwp', label: 'Solid UWP', color: '#facc15' },
    { value: 'lean-uwp', label: 'Likely UWP', color: '#fde047' },
    { value: 'tossup', label: 'Tossup', color: '#a855f7' },
    { value: 'lean-slp', label: 'Likely SLP', color: '#f87171' },
    { value: 'solid-slp', label: 'Solid SLP', color: '#dc2626' },
];

const makeYourOwnLeaningOptions = [
  { value: 'slp', label: 'SLP' },
  { value: 'uwp', label: 'UWP' },
  { value: 'ind', label: 'IND' },
  { value: 'tossup', label: 'Toss Up' },
  { value: 'unselected', label: 'To be selected' },
];


const getLeaningStyle = (leaningValue?: string, isMakeYourOwn?: boolean) => {
    const options = isMakeYourOwn ? makeYourOwnLeaningOptions : politicalLeaningOptions;
    const defaultLeaningValue = isMakeYourOwn ? 'unselected' : 'tossup';
    const leaningInfo = options.find(o => o.value === leaningValue) || options.find(o => o.value === defaultLeaningValue);
    
    let label = leaningInfo?.label || 'Tossup';
    if (leaningValue?.includes('ind')) {
        label = label.replace('SLP', 'IND');
    }
    
    return { 
        label,
        color: leaningInfo?.color,
    };
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
    logoUrl,
    hideLogo,
    popoverVariant = 'default',
    colorOverride,
    election,
    constituency
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
    hideLogo?: boolean;
    popoverVariant?: 'default' | 'dashboard';
    colorOverride?: string;
    election?: Election | null;
    constituency: Constituency;
}) {
    const [isProfileOpen, setProfileOpen] = useState(false);
    const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate(s) N/A';
    const displayName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate(s) N/A';


    const votePercentage = totalVotes && votes ? (votes / totalVotes) * 100 : 0;
    
    const textColorClass = () => {
        if (!election || election.isCurrent) {
            const isSpecialCase = election?.year === 2021 && (constituency.name === 'Castries North' || constituency.name === 'Castries Central');
            if(isSpecialCase && party?.acronym !== 'UWP'){
              return 'text-white';
            }
            return 'text-black';
        }
        if (party?.acronym === 'UWP') return 'text-green-600';
        if (party?.acronym === 'SLP') return 'text-white';
        return 'text-black';
    };


    return (
        <>
             <div className={cn(
                "p-2 rounded-md bg-muted relative h-full flex flex-col items-center gap-2 text-center",
                candidate && 'cursor-pointer'
            )}
            onClick={() => candidate && setProfileOpen(true)}
            >
                {candidate?.isIncumbent && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        Incumbent
                    </div>
                )}
                <div className="flex w-full items-center gap-2">
                    <div className={cn("relative w-20 flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-md", isWinner && "ring-2 ring-green-500")}
                    onClick={() => candidate && setProfileOpen(true)}>
                        {popoverVariant === 'dashboard' && party?.name && (
                            <p className="font-semibold text-xs mb-1">{party.name}</p>
                        )}
                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {candidate?.imageUrl ? (
                                <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                            ) : (
                                <UserSquare className="h-full w-full text-muted-foreground" />
                            )}
                        </div>
                         <p className="text-xs font-semibold whitespace-normal leading-tight" onClick={() => candidate && setProfileOpen(true)}>
                           {displayName}
                        </p>
                        {isWinner && <CheckCircle2 className="h-4 w-4 text-green-600 absolute top-[-4px] right-[-4px] bg-white rounded-full" />}
                    </div>

                     <div className="flex-grow flex flex-col items-center gap-2">
                        {!hideLogo && (
                            <div className="relative h-10 w-10">
                                {logoUrl ? (
                                    <Image src={logoUrl} alt={party?.name || ''} fill className="object-contain" />
                                ) : null}
                            </div>
                        )}
                        <div className="relative w-full h-8 bg-gray-200 rounded overflow-hidden self-center">
                            <div 
                                className={cn("absolute top-0 left-0 h-full rounded", isStriped && barFill === 'blue-red-stripes' && 'bg-blue-600')}
                                style={{ width: `${votePercentage}%`, backgroundColor: colorOverride || ((isStriped && barFill === 'blue-red-stripes') ? '' : party?.color) }}
                            >
                                {isStriped && barFill === 'blue-red-stripes' && <div className="absolute inset-0 red-stripes-overlay"></div>}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-between px-2">
                                <span className={cn("font-bold text-xs", textColorClass())}>
                                    {votes?.toLocaleString()}
                                    {isWinner && margin ? <sup className="font-semibold"> (+{margin.toLocaleString()})</sup> : null}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn("font-bold text-xs", 'text-black' )}>
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
            </div>
            {candidate && <CandidateProfileDialog candidate={candidate as Candidate} isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />}
        </>
    );
}

const GaugeChart = ({ slpPercentage = 50, uwpPercentage = 50, slpColor = '#ef4444', uwpColor = '#f59e0b' }) => {
    // Map 0-100 range to -90 to 90 degrees for the rotation.
    // SLP 100% -> -90deg, 50% -> 0deg, 0% -> 90deg
    const rotation = (50 - slpPercentage) * 1.8;
  
    return (
      <div className="relative w-40 h-20 mx-auto">
        <div className="absolute inset-0 overflow-hidden rounded-t-full flex">
          <div className="w-1/2 h-full" style={{ backgroundColor: slpColor }}></div>
          <div className="w-1/2 h-full" style={{ backgroundColor: uwpColor }}></div>
        </div>
        <div 
          className="absolute bottom-0 left-1/2 w-0.5 h-full origin-bottom transition-transform duration-500"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        >
          <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-black"></div>
           {/* Arrowhead */}
           <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-black"></div>
        </div>
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-black"></div>
      </div>
    );
};
  

export function ConstituencyPopoverContent({ 
    constituency, 
    election,
    onLeaningChange,
    onPredictionChange,
    electionResults,
    previousElectionResults,
    previousElection,
    partyLogos,
    isMakeYourOwn,
    showCandidateBoxes = true,
    hideLogos = false,
    popoverVariant = 'default',
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
    showCandidateBoxes?: boolean;
    hideLogos?: boolean;
    popoverVariant?: 'default' | 'dashboard';
}) {
    const { firestore } = useFirebase();

    const isCurrentElection = !election || election.isCurrent;
    const collectionName = useMemo(() => (isCurrentElection ? 'candidates' : 'archived_candidates'), [isCurrentElection]);

    const candidatesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, collectionName), where('constituencyId', '==', constituency.id));
        if (!isCurrentElection && election) {
            q = query(q, where('electionId', '==', election.id));
        }
        return q;
    }, [firestore, constituency.id, election, collectionName]);

    const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);

    const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate | ArchivedCandidate>(candidatesQuery);
    const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

    const { slpCandidate, uwpCandidate, independentCandidate, slpParty, uwpParty } = useMemo(() => {
        if (!parties) {
            return { slpCandidate: null, uwpCandidate: null, independentCandidate: null, slpParty: null, uwpParty: null };
        }
        const slp = parties.find(p => p.acronym === 'SLP');
        const uwp = parties.find(p => p.acronym === 'UWP');

        if(election?.year === 2021) {
            if(constituency.name === 'Castries North') {
                return {
                    slpCandidate: null,
                    uwpCandidate: candidates?.find(c => c.partyId === uwp?.id) || null,
                    independentCandidate: { id: 'stephenson-king', firstName: 'Stephenson', lastName: 'King', imageUrl: "https://i.ibb.co/zV17Pht/king.png", isIncumbent: true } as Candidate,
                    slpParty: slp,
                    uwpParty: uwp,
                }
            }
             if(constituency.name === 'Castries Central') {
                return {
                    slpCandidate: null,
                    uwpCandidate: candidates?.find(c => c.partyId === uwp?.id) || null,
                    independentCandidate: { id: 'richard-frederick', firstName: 'Richard', lastName: 'Frederick', imageUrl: "https://i.ibb.co/Y7wMKbNK/RF.png", isIncumbent: true } as Candidate,
                    slpParty: slp,
                    uwpParty: uwp,
                }
            }
        }
        
        if (!candidates) {
            return { slpCandidate: null, uwpCandidate: null, independentCandidate: null, slpParty: slp, uwpParty: uwp };
        }

        let slpCand = slp ? candidates.find(c => c.partyId === slp.id) : null;
        let uwpCand = uwp ? candidates.find(c => c.partyId === uwp.id) : null;
        
        let indCand = candidates.find(c => 
            (c as Candidate).isIndependentCastriesNorth || (c as Candidate).isIndependentCastriesCentral
        );

        if (!indCand) {
           indCand = candidates.find(c => c.partyId === 'independent' || c.partyId === 'IND');
        }

        // Special handling for Stephenson King (and others) who may run as IND but are still associated with SLP in some data structures
        if(indCand && slpCand && indCand.id === slpCand.id) {
            slpCand = null; // Don't show him as SLP if he's the independent candidate
        }
        
        return { slpCandidate: slpCand, uwpCandidate: uwpCand, independentCandidate: indCand || null, slpParty: slp, uwpParty: uwp };
    }, [parties, candidates, constituency.name, election]);
    
    const { chartData, chartConfig } = useMemo(() => {
        if (!constituency || !parties) return { chartData: [], chartConfig: {} };
        const slpParty = parties.find(p => p.acronym === 'SLP');
        const uwpParty = parties.find(p => p.acronym === 'UWP');
    
        const config: ChartConfig = {};
        if (slpParty) config.slp = { label: 'SLP', color: slpParty.color };
        if (uwpParty) config.uwp = { label: 'UWP', color: uwpParty.color };
        
        const isSpecialConstituency = constituency.name === 'Castries North' || constituency.name === 'Castries Central';
    
        if(isSpecialConstituency){
            config.ind = { label: 'IND', color: '#3b82f6' };
        }
    
        const uwpPercentage = isSpecialConstituency ? 100 - (constituency.predictedSlpPercentage || 50) : constituency.predictedUwpPercentage || 50;
        
        const data = isSpecialConstituency
            ? [
                { party: 'uwp', votes: uwpPercentage, fill: uwpParty?.color || '#f59e0b' },
                { party: 'ind', votes: constituency.predictedSlpPercentage || 50, fill: '#3b82f6' },
              ]
            : [
                { party: 'slp', votes: constituency.predictedSlpPercentage || 50, fill: slpParty?.color || '#ef4444' },
                { party: 'uwp', votes: uwpPercentage, fill: uwpParty?.color || '#f59e0b' },
              ];
    
        return { chartData: data.sort((a, b) => (a.party > b.party ? 1 : -1)), chartConfig: config };
    }, [constituency, parties]);

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
            if (!partyLogos || !parties) return undefined;
            const electionLogo = partyLogos.find(logo => logo.partyId === partyId && logo.electionId === election?.id);
            const party = parties.find(p => p.id === partyId);

            if (!party) return undefined;

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
            slpLogoUrl: slpParty ? getLogo(slpParty.id) : undefined,
            uwpLogoUrl: uwpParty ? getLogo(uwpParty.id) : undefined,
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
        if (constituency.name === 'Castries North' || constituency.name === 'Castries Central') {
            return makeYourOwnLeaningOptions.filter(o => o.value === 'uwp' || o.value === 'ind' || o.value === 'unselected');
        }
        return makeYourOwnLeaningOptions.filter(o => o.value === 'slp' || o.value === 'uwp' || o.value === 'unselected');
    }, [constituency.name]);
    
    const popoverText = useMemo(() => {
        const lean = constituency.politicalLeaning;
        if (lean?.includes('ind') && constituency.slpDashboardPopoverText) {
             return constituency.slpDashboardPopoverText;
        }
        if (lean?.includes('slp') && constituency.slpDashboardPopoverText) {
            return constituency.slpDashboardPopoverText;
        }
        if (lean?.includes('uwp') && constituency.uwpDashboardPopoverText) {
            return constituency.uwpDashboardPopoverText;
        }
        return null;
    }, [constituency]);

    const isSpecialConstituencyForIND = constituency.name === 'Castries North' || constituency.name === 'Castries Central';

    const leaningStyle = getLeaningStyle(constituency.politicalLeaning?.includes('slp') && isSpecialConstituencyForIND ? constituency.politicalLeaning.replace('slp', 'ind') : constituency.politicalLeaning);

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }
    
    return (
        <div className="space-y-3 w-80">
             <div className="text-center">
                <h4 className="font-bold leading-none text-xl flex items-center justify-center gap-2">
                    {constituency.logoUrl && <Image src={constituency.logoUrl} alt={constituency.name} width={24} height={24} />}
                    {constituency.name}
                </h4>
                {onLeaningChange && isMakeYourOwn && (
                    <h5 className="col-span-full text-xs font-medium text-muted-foreground text-center mt-1">Choose Your Pick</h5>
                )}
                 {popoverVariant === 'dashboard' && (
                    <p className="text-sm font-semibold text-center mt-1" style={{ color: leaningStyle.color }}>
                        {leaningStyle.label}
                    </p>
                )}
            </div>
            {popoverVariant === 'dashboard' ? (
                 <div className="space-y-4">
                    <div className="space-y-2">
                         <GaugeChart 
                            slpPercentage={constituency.predictedSlpPercentage} 
                            uwpPercentage={constituency.predictedUwpPercentage} 
                            slpColor={slpParty?.color}
                            uwpColor={uwpParty?.color}
                        />
                    </div>
                    {uwpParty && slpParty && <div className="grid grid-cols-2 gap-2">
                        {isSpecialConstituencyForIND ? (
                            <>
                                {independentCandidate && <div className="flex flex-col items-center p-2 rounded-md bg-muted text-center cursor-pointer" onClick={() => independentCandidate && setProfileOpen(true)}>
                                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-300">
                                        {independentCandidate?.imageUrl ? <Image src={independentCandidate.imageUrl} alt={independentCandidate.name || ''} fill className="object-cover" /> : <UserSquare className="h-full w-full text-gray-400" />}
                                    </div>
                                    <p className="text-xs font-semibold mt-1">{independentCandidate ? `${independentCandidate.firstName} ${independentCandidate.lastName}` : 'IND Candidate'}{independentCandidate?.isIncumbent && ' (Inc.)'}</p>
                                    <p className="text-xs text-muted-foreground">IND</p>
                                </div>}
                                {uwpCandidate && <div className="flex flex-col items-center p-2 rounded-md bg-muted text-center cursor-pointer" onClick={() => uwpCandidate && setProfileOpen(true)}>
                                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-300">
                                        {uwpCandidate?.imageUrl ? <Image src={uwpCandidate.imageUrl} alt={uwpCandidate.name || ''} fill className="object-cover" /> : <UserSquare className="h-full w-full text-gray-400" />}
                                    </div>
                                    <p className="text-xs font-semibold mt-1">{uwpCandidate ? `${uwpCandidate.firstName} ${uwpCandidate.lastName}` : 'UWP Candidate'}{uwpCandidate?.isIncumbent && ' (Inc.)'}</p>
                                    <p className="text-xs text-muted-foreground">{uwpParty?.acronym}</p>
                                </div>}
                            </>
                        ) : (
                            <>
                                {slpCandidate && (
                                    <div className="flex flex-col items-center p-2 rounded-md bg-muted text-center cursor-pointer" onClick={() => slpCandidate && setProfileOpen(true)}>
                                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-300">
                                            {slpCandidate.imageUrl ? <Image src={slpCandidate.imageUrl} alt={slpCandidate.name || ''} fill className="object-cover" /> : <UserSquare className="h-full w-full text-gray-400" />}
                                        </div>
                                        <p className="text-xs font-semibold mt-1">{slpCandidate ? `${slpCandidate.firstName} ${slpCandidate.lastName}` : 'SLP Candidate'}{slpCandidate?.isIncumbent && ' (Inc.)'}</p>
                                        <p className="text-xs text-muted-foreground">{slpParty?.acronym}</p>
                                    </div>
                                )}
                                {uwpCandidate && (
                                    <div className="flex flex-col items-center p-2 rounded-md bg-muted text-center cursor-pointer" onClick={() => uwpCandidate && setProfileOpen(true)}>
                                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-300">
                                            {uwpCandidate.imageUrl ? <Image src={uwpCandidate.imageUrl} alt={uwpCandidate.name || ''} fill className="object-cover" /> : <UserSquare className="h-full w-full text-gray-400" />}
                                        </div>
                                        <p className="text-xs font-semibold mt-1">{uwpCandidate ? `${uwpCandidate.firstName} ${uwpCandidate.lastName}` : 'UWP Candidate'}{uwpCandidate?.isIncumbent && ' (Inc.)'}</p>
                                        <p className="text-xs text-muted-foreground">{uwpParty?.acronym}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>}
                     {popoverText && (
                        <div className="text-sm text-center text-muted-foreground pt-2 border-t mt-2">
                            {popoverText}
                        </div>
                    )}
                </div>
            ) : (
              <>
                {showCandidateBoxes && (election?.isCurrent || !election) && !isMakeYourOwn ? (
                    <div className="space-y-2">
                        {uwpCandidate && (
                            <div className="flex flex-col items-center p-2 rounded-md bg-muted text-center cursor-pointer" onClick={() => uwpCandidate && setProfileOpen(true)}>
                                <div className="relative h-8 w-8 mb-2">
                                    {uwpParty?.logoUrl && !hideLogos ? (
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
                                <p className="text-xs font-semibold mt-1">{uwpCandidate ? `${uwpCandidate.firstName} ${uwpCandidate.lastName}` : 'Candidate(s) N/A'}</p>
                                {uwpCandidate?.isIncumbent && <span className="font-normal text-muted-foreground text-xs">(Incumbent)</span>}
                            </div>
                        )}
                        {independentCandidate && (
                            <div className="flex flex-col items-center p-2 rounded-md bg-muted text-center cursor-pointer" onClick={() => independentCandidate && setProfileOpen(true)}>
                                <div className="relative h-8 w-8 mb-2">
                                    {indLogoUrl && !hideLogos && <Image src={indLogoUrl} alt="Independent" fill className="object-contain" />}
                                </div>
                                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-transparent">
                                {independentCandidate?.imageUrl ? (
                                    <Image src={independentCandidate.imageUrl} alt={independentCandidate?.name || 'Independent Candidate'} fill className="object-cover" />
                                ) : (
                                    <UserSquare className="h-full w-full text-gray-400" />
                                )}
                                </div>
                                <p className="text-xs font-semibold mt-1">{independentCandidate ? `${independentCandidate.firstName} ${independentCandidate.lastName}` : 'Candidate(s) N/A'}</p>
                                {independentCandidate?.isIncumbent && <span className="font-normal text-muted-foreground text-xs">(Incumbent)</span>}
                            </div>
                        )}
                        {slpCandidate && (
                            <div className="flex flex-col items-center p-2 rounded-md bg-muted text-center cursor-pointer" onClick={() => slpCandidate && setProfileOpen(true)}>
                                <div className="relative h-8 w-8 mb-2">
                                    {slpParty?.logoUrl && !hideLogos ? (
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
                                <p className="text-xs font-semibold mt-1">{slpCandidate ? `${slpCandidate.firstName} ${slpCandidate.lastName}` : 'Candidate(s) N/A'}</p>
                                {slpCandidate?.isIncumbent && <span className="font-normal text-muted-foreground text-xs">(Incumbent)</span>}
                            </div>
                        )}
                    </div>
                ) : !isMakeYourOwn ? (
                <div className="space-y-2">
                    {uwpCandidate && (
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
                            hideLogo={hideLogos}
                            popoverVariant={popoverVariant}
                            election={election}
                            constituency={constituency}
                        />
                    )}
                    {(isSpecialConstituency || (currentResult?.otherVotes || 0) > 0 || independentCandidate) && (
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
                            hideLogo={hideLogos}
                            popoverVariant={popoverVariant}
                            colorOverride={chartConfig.ind?.color}
                            election={election}
                            constituency={constituency}
                        />
                    )}
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
                            hideLogo={hideLogos}
                            popoverVariant={popoverVariant}
                            election={election}
                            constituency={constituency}
                        />
                    )}
                </div>
                ) : null}
                
                {onLeaningChange && isMakeYourOwn && (
                    <div className="space-y-2 pt-2">
                        <div className={cn("grid gap-2 text-center text-xs font-semibold items-start", (constituency.name === 'Castries North' || constituency.name === 'Castries Central') ? "grid-cols-2" : "grid-cols-2")}>
                            
                             {(constituency.name === 'Castries North' || constituency.name === 'Castries Central') ? (
                                <>
                                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => uwpCandidate && setProfileOpen(true)}>
                                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                                            {uwpCandidate?.imageUrl ? <Image src={uwpCandidate.imageUrl} alt={uwpCandidate.name || ''} fill className="object-cover" /> : <UserSquare className="h-full w-full text-gray-400" />}
                                        </div>
                                        <p className="font-semibold">{uwpCandidate ? `${uwpCandidate.firstName} ${uwpCandidate.lastName}` : 'UWP Candidate'}</p>
                                        <RadioGroup 
                                            value={constituency.politicalLeaning} 
                                            onValueChange={onLeaningChange}
                                            className="grid grid-cols-1 gap-1 pt-1"
                                        >
                                            <Label htmlFor={`${constituency.id}-uwp`} className={cn("flex-1 text-center border rounded-md px-2 py-1 text-xs font-medium cursor-pointer transition-colors", constituency.politicalLeaning === 'uwp' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                                                <RadioGroupItem value="uwp" id={`${constituency.id}-uwp`} className="sr-only" />
                                                UWP
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => independentCandidate && setProfileOpen(true)}>
                                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                                            {independentCandidate?.imageUrl ? <Image src={independentCandidate.imageUrl} alt={independentCandidate.name || ''} fill className="object-cover" /> : <UserSquare className="h-full w-full text-gray-400" />}
                                        </div>
                                        <p className="font-semibold">{independentCandidate ? `${independentCandidate.firstName} ${independentCandidate.lastName}` : 'IND Candidate'}</p>
                                        <RadioGroup 
                                            value={constituency.politicalLeaning} 
                                            onValueChange={onLeaningChange}
                                            className="grid grid-cols-1 gap-1 pt-1"
                                        >
                                            <Label htmlFor={`${constituency.id}-ind`} className={cn("flex-1 text-center border rounded-md px-2 py-1 text-xs font-medium cursor-pointer transition-colors", constituency.politicalLeaning === 'ind' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                                                <RadioGroupItem value="ind" id={`${constituency.id}-ind`} className="sr-only" />
                                                IND
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => slpCandidate && setProfileOpen(true)}>
                                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                                            {slpCandidate?.imageUrl ? <Image src={slpCandidate.imageUrl} alt={slpCandidate.name || ''} fill className="object-cover" /> : <UserSquare className="h-full w-full text-gray-400" />}
                                        </div>
                                        <p className="font-semibold">{slpCandidate ? `${slpCandidate.firstName} ${slpCandidate.lastName}` : 'SLP Candidate'}</p>
                                        <RadioGroup 
                                            value={constituency.politicalLeaning} 
                                            onValueChange={onLeaningChange}
                                            className="grid grid-cols-1 gap-1 pt-1"
                                        >
                                            <Label htmlFor={`${constituency.id}-slp`} className={cn("flex-1 text-center border rounded-md px-2 py-1 text-xs font-medium cursor-pointer transition-colors", constituency.politicalLeaning === 'slp' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                                                <RadioGroupItem value="slp" id={`${constituency.id}-slp`} className="sr-only" />
                                                SLP
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => uwpCandidate && setProfileOpen(true)}>
                                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                                            {uwpCandidate?.imageUrl ? <Image src={uwpCandidate.imageUrl} alt={uwpCandidate.name || ''} fill className="object-cover" /> : <UserSquare className="h-full w-full text-gray-400" />}
                                        </div>
                                        <p className="font-semibold">{uwpCandidate ? `${uwpCandidate.firstName} ${uwpCandidate.lastName}` : 'UWP Candidate'}</p>
                                        <RadioGroup 
                                            value={constituency.politicalLeaning} 
                                            onValueChange={onLeaningChange}
                                            className="grid grid-cols-1 gap-1 pt-1"
                                        >
                                            <Label htmlFor={`${constituency.id}-uwp`} className={cn("flex-1 text-center border rounded-md px-2 py-1 text-xs font-medium cursor-pointer transition-colors", constituency.politicalLeaning === 'uwp' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                                                <RadioGroupItem value="uwp" id={`${constituency.id}-uwp`} className="sr-only" />
                                                UWP
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                </>
                            )}
                            
                        </div>
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
                            <span className="text-xs font-semibold" style={{color: slpParty?.color}}>SLP: {constituency.predictedSlpPercentage || 50}%</span>
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
              </>
            )}
        </div>
    );
}
