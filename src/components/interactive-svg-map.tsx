
'use client';

import { useMemo } from 'react';
import type { Constituency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConstituencyPopoverContent } from '@/components/constituency-popover-content';

interface InteractiveSvgMapProps {
    constituencies: Constituency[];
    selectedConstituencyId: string | null;
    onConstituencyClick: (id: string) => void;
}

const politicalLeaningOptions = [
  { value: 'solid-uwp', label: 'Solid UWP', color: 'fill-yellow-500' },
  { value: 'lean-uwp', label: 'Lean UWP', color: 'fill-yellow-300' },
  { value: 'tossup', label: 'Tossup', color: 'fill-purple-500' },
  { value: 'lean-slp', label: 'Lean SLP', color: 'fill-red-400' },
  { value: 'solid-slp', label: 'Solid SLP', color: 'fill-red-700' },
];

const getLeaningInfo = (leaning: string | undefined) => {
    const defaultLeaning = politicalLeaningOptions.find(o => o.value === 'tossup')!;
    const leaningInfo = politicalLeaningOptions.find(o => o.value === leaning) || defaultLeaning;
    return { className: leaningInfo.color };
};

const SVGPaths: Record<string, string> = {};

// ... component implementation continues
export function InteractiveSvgMap({ constituencies, selectedConstituencyId, onConstituencyClick }: InteractiveSvgMapProps) {
    const constituencyMap = useMemo(() => {
        const map = new Map<string, Constituency>();
        const anseLaRayeCanariesId = '4CRZlKXDXQCBPzvXjYeD';

        const anseLaRayeConstituency = constituencies.find(c => c.id === anseLaRayeCanariesId);
        if (anseLaRayeConstituency) {
            map.set("Anse-La-Raye/Canaries", anseLaRayeConstituency);
        } else {
            // Create a fallback if not found in Firestore
            const fallback: Constituency = {
                id: anseLaRayeCanariesId,
                name: 'Anse-la-Raye/Canaries',
                demographics: { registeredVoters: 0 },
                politicalLeaning: 'tossup',
            };
            map.set("Anse-La-Raye/Canaries", fallback);
        }

        const remainingConstituencies = constituencies.filter(c => c.id !== anseLaRayeCanariesId);

        for (const constituency of remainingConstituencies) {
            map.set(constituency.name, constituency);
        }

        // Ensure all 17 constituencies from SVGPaths are in the map
        for (const name in SVGPaths) {
            if (!map.has(name) && name !== "Anse-La-Raye/Canaries") {
                 const fallback: Constituency = {
                    id: name, // Use name as a fallback ID
                    name: name,
                    demographics: { registeredVoters: 0 },
                    politicalLeaning: 'tossup',
                };
                map.set(name, fallback);
            }
        }
        
        return map;
    }, [constituencies]);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            width="100%"
            height="100%"
            viewBox="0 0 800 1533"
        >
            {Object.entries(SVGPaths).map(([name, pathData]) => {
                const constituency = constituencyMap.get(name);
                if (!constituency) return null;
                
                const { className: leaningClassName } = getLeaningInfo(constituency.politicalLeaning);
                const isSelected = constituency.id === selectedConstituencyId;

                return (
                    <Popover key={constituency.id}>
                        <PopoverTrigger asChild>
                            <path
                                d={pathData}
                                id={constituency.name}
                                className={cn(
                                    "cursor-pointer transition-all duration-300",
                                    leaningClassName,
                                    "stroke-white stroke-2 hover:stroke-primary hover:stroke-[4]",
                                    isSelected ? "stroke-primary stroke-[4]" : ""
                                )}
                                onClick={() => onConstituencyClick(constituency.id)}
                            />
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                           <ConstituencyPopoverContent constituency={constituency} />
                        </PopoverContent>
                    </Popover>
                );
            })}
        </svg>
    );
}
