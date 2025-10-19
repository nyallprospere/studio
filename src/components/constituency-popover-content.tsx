
'use client';

import { useMemo, useState } from 'react';
import type { Constituency, Candidate, Party } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';
import { UserSquare, User } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Button } from './ui/button';
import { CandidateProfileDialog } from './candidate-profile-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

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

function CandidateBox({ candidate, party }: { candidate: Candidate | null, party: Party | null }) {
    const [isProfileOpen, setProfileOpen] = useState(false);
    const isIncumbent = candidate?.isIncumbent;
    const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}${isIncumbent ? '*' : ''}` : 'Candidate TBD';

    if (!party) {
         return (
            <div className="flex flex-col items-center gap-2 p-2 rounded-md bg-muted flex-1">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                    <UserSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-xs text-center">
                    <p className="font-semibold text-muted-foreground">{candidateName}</p>
                </div>
            </div>
        );
    }
    
    const partyText = `${party.acronym} Candidate`;

    return (
        <>
            <div className="flex flex-col items-center gap-2 p-2 rounded-md bg-muted flex-1">
                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-background">
                    {candidate?.imageUrl ? (
                        <Image src={candidate.imageUrl} alt={candidateName} fill className="object-cover" />
                    ) : (
                        <UserSquare className="h-full w-full text-muted-foreground" />
                    )}
                </div>
                <div className="text-center">
                    <p className="font-semibold text-xs">{candidateName}</p>
                    <div style={{ color: party.color }}>
                        <span className="font-bold text-[10px]">{partyText}</span>
                    </div>
                </div>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setProfileOpen(true)} disabled={!candidate}>
                    View Profile
                </Button>
            </div>
            <CandidateProfileDialog candidate={candidate} isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />
        </>
    );
}


export function ConstituencyPopoverContent({ 
    constituency, 
    onLeaningChange,
    onPredictionChange 
}: { 
    constituency: Constituency,
    onLeaningChange?: (leaning: string) => void;
    onPredictionChange?: (slp: number, uwp: number) => void;
}) {
    const { firestore } = useFirebase();

    const candidatesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'candidates'), where('constituencyId', '==', constituency.id)) : null,
        [firestore, constituency.id]
    );
    const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);

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

    const chartData = useMemo(() => [
        { name: 'SLP', value: constituency.predictedSlpPercentage || 50, color: '#E74C3C' },
        { name: 'UWP', value: constituency.predictedUwpPercentage || 50, color: '#F1C40F' },
    ], [constituency.predictedSlpPercentage, constituency.predictedUwpPercentage]);

    const isLoading = loadingCandidates || loadingParties;

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }

    return (
        <div className="space-y-3">
            <h4 className="font-bold leading-none text-center text-xl">{constituency.name}</h4>
            
            <div>
                <h5 className="text-center text-xs font-bold underline text-muted-foreground">Odds of Winning</h5>
                <div className="relative h-24 w-full -mb-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="100%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius="60%"
                                outerRadius="100%"
                                dataKey="value"
                                paddingAngle={2}
                            >
                                {chartData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="font-bold text-sm text-muted-foreground -mt-4">{getLeaningLabel(constituency.politicalLeaning)}</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <CandidateBox candidate={slpCandidate!} party={slpParty!} />
                <CandidateBox candidate={uwpCandidate!} party={uwpParty!} />
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
