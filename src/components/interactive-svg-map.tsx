
'use client';

import { useMemo } from 'react';
import type { Constituency, ElectionResult, Election, PartyLogo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConstituencyPopoverContent } from '@/components/constituency-popover-content';

interface InteractiveSvgMapProps {
    constituencies: Constituency[];
    selectedConstituencyId: string | null;
    election?: Election | null;
    onConstituencyClick: (id: string) => void;
    onLeaningChange?: (id: string, leaning: string) => void;
    onPredictionChange?: (id: string, slp: number, uwp: number) => void;
    electionResults?: ElectionResult[];
    previousElectionResults?: ElectionResult[];
    previousElection?: Election | null;
    partyLogos?: PartyLogo[];
    isMakeYourOwn?: boolean;
    hideLogos?: boolean;
}

const politicalLeaningOptions = [
  { value: 'solid-uwp', label: 'Solid UWP', color: 'fill-yellow-500' },
  { value: 'lean-uwp', label: 'Lean UWP', color: 'fill-yellow-300' },
  { value: 'tossup', label: 'Tossup', color: 'fill-purple-500' },
  { value: 'lean-slp', label: 'Lean SLP', color: 'fill-red-400' },
  { value: 'solid-slp', label: 'Solid SLP', color: 'fill-red-700' },
];

const makeYourOwnLeaningOptions = [
  { value: 'slp', label: 'SLP', color: 'fill-red-500' },
  { value: 'uwp', label: 'UWP', color: 'fill-yellow-400' },
  { value: 'ind', label: 'IND', color: 'fill-blue-500' },
  { value: 'unselected', label: 'To be selected', color: 'fill-gray-300' },
];


const getLeaningInfo = (leaning: string | undefined, isMakeYourOwn?: boolean) => {
    const options = isMakeYourOwn ? makeYourOwnLeaningOptions : politicalLeaningOptions;
    const defaultLeaningValue = isMakeYourOwn ? 'unselected' : 'tossup';
    const defaultLeaning = options.find(o => o.value === defaultLeaningValue)!;
    const leaningInfo = options.find(o => o.value === leaning) || defaultLeaning;
    return { className: leaningInfo.color };
};

const SVGPaths: Record<string, string> = {};

export function InteractiveSvgMap({ constituencies, selectedConstituencyId, election, onConstituencyClick, onLeaningChange, onPredictionChange, electionResults, previousElectionResults, previousElection, partyLogos, isMakeYourOwn, hideLogos }: InteractiveSvgMapProps) {
    const constituencyMap = useMemo(() => {
        const map = new Map<string, Constituency>();
        const anseLaRayeCanariesId = '4CRZlKXDXQCBPzvXjYeD';

        const anseLaRayeConstituency = constituencies.find(c => c.id === anseLaRayeCanariesId);
        if (anseLaRayeConstituency) {
            map.set("Anse-la-Raye/Canaries", anseLaRayeConstituency);
        } else {
            // Create a fallback if not found in Firestore
            const fallback: Constituency = {
                id: anseLaRayeCanariesId,
                name: 'Anse-la-Raye/Canaries',
                demographics: { registeredVoters: 0 },
                politicalLeaning: isMakeYourOwn ? 'unselected' : 'tossup',
            };
            map.set("Anse-la-Raye/Canaries", fallback);
        }

        const remainingConstituencies = constituencies.filter(c => c.id !== anseLaRayeCanariesId);

        for (const constituency of remainingConstituencies) {
            map.set(constituency.name, constituency);
        }

        // Ensure all 17 constituencies from SVGPaths are in the map
        for (const name in SVGPaths) {
            if (!map.has(name) && name !== "Anse-la-Raye/Canaries") {
                 const fallback: Constituency = {
                    id: name, // Use name as a fallback ID
                    name: name,
                    demographics: { registeredVoters: 0 },
                    politicalLeaning: isMakeYourOwn ? 'unselected' : 'tossup',
                };
                map.set(name, fallback);
            }
        }
        
        return map;
    }, [constituencies, isMakeYourOwn]);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            width="100%"
            height="100%"
            viewBox="0 0 800 1533"
        >
            <defs>
                <pattern id="stripes" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                    <rect width="10" height="10" fill="#2980B9"></rect>
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#E74C3C" strokeWidth="6"></line>
                </pattern>
                <pattern id="red-white-stripes" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                    <rect width="10" height="10" fill="#E74C3C"></rect>
                    <line x1="0" y1="0" x2="0" y2="10" stroke="white" strokeWidth="6"></line>
                </pattern>
            </defs>
            {Object.entries(SVGPaths).map(([name, pathData]) => {
                const constituency = constituencyMap.get(name);
                if (!constituency) return null;
                
                const electionYear = election?.year;
                const isSpecialYear = electionYear === 2021 || election?.isCurrent;

                const result = electionResults?.find(r => r.constituencyId === constituency.id);
                const slpWon = result && result.slpVotes > result.uwpVotes;
                
                let isStriped = false;
                let stripesId = "stripes";
                
                if (isSpecialYear) {
                    if (name === 'Castries North') {
                        isStriped = true;
                        stripesId = "stripes";
                    } else if (name === 'Castries Central') {
                        isStriped = true;
                        stripesId = "red-white-stripes";
                    }
                }
                
                const { className: leaningClassName } = getLeaningInfo(constituency.politicalLeaning, isMakeYourOwn);
                const isSelected = constituency.id === selectedConstituencyId;

                return (
                    <Popover key={constituency.id}>
                        <PopoverTrigger asChild>
                            <path
                                d={pathData}
                                id={constituency.name}
                                className={cn(
                                    "cursor-pointer transition-all duration-300",
                                    !isStriped && leaningClassName,
                                    "stroke-white stroke-2 hover:stroke-black hover:stroke-[4]",
                                    isSelected ? "stroke-black stroke-[4]" : ""
                                )}
                                fill={isStriped ? `url(#${stripesId})` : undefined}
                                onClick={() => onConstituencyClick(constituency.id)}
                            />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto" side="right">
                           <ConstituencyPopoverContent 
                                constituency={constituency}
                                election={election}
                                onLeaningChange={onLeaningChange ? (leaning) => onLeaningChange(constituency.id, leaning) : undefined}
                                onPredictionChange={onPredictionChange ? (slp, uwp) => onPredictionChange(constituency.id, slp, uwp) : undefined}
                                electionResults={electionResults}
                                previousElectionResults={previousElectionResults}
                                previousElection={previousElection}
                                partyLogos={partyLogos}
                                isMakeYourOwn={isMakeYourOwn}
                                hideLogos={hideLogos}
                           />
                        </PopoverContent>
                    </Popover>
                );
            })}
        </svg>
    );
}
