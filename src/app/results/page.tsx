
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Election, ElectionResult, Party, Constituency, PartyLogo } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, orderBy, query, getDocs } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';


export default function ResultsPage() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const yearFromQuery = searchParams.get('year');

  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const partyLogosQuery = useMemoFirebase(() => firestore ? collection(firestore, 'party_logos') : null, [firestore]);

  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  const { data: partyLogos, isLoading: loadingLogos } = useCollection<PartyLogo>(partyLogosQuery);
  
  const [selectedElectionId, setSelectedElectionId] = useState<string | undefined>(undefined);
  const [resultsByYear, setResultsByYear] = useState<Record<string, ElectionResult[]>>({});
  const [loadingResults, setLoadingResults] = useState(true);
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);

  const sortedElections = useMemo(() => {
    if (!elections) return [];
    
    const now = new Date();
    // Filter out elections that are in the future, unless they are marked as the current one to work on
    const pastElections = elections.filter(election => {
        const electionYear = election.year;
        return election.isCurrent ? true : electionYear <= now.getFullYear();
    });

    return [...pastElections].sort((a, b) => {
        if (a.year !== b.year) {
            return b.year - a.year;
        }
        return b.name.localeCompare(a.name);
    });
  }, [elections]);

  useEffect(() => {
    if (yearFromQuery && sortedElections.find(e => e.id === yearFromQuery)) {
      setSelectedElectionId(yearFromQuery);
    } else if (sortedElections && sortedElections.length > 0 && !selectedElectionId) {
      setSelectedElectionId(sortedElections[0].id);
    }
  }, [yearFromQuery, sortedElections, selectedElectionId]);

  useEffect(() => {
    async function fetchAllResults() {
      if (!firestore) return;
      setLoadingResults(true);
      const resultsRef = collection(firestore, 'election_results');
      const resultsSnap = await getDocs(resultsRef);
      const allResults = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ElectionResult));
      
      const groupedResults = allResults.reduce((acc, result) => {
        const electionId = result.electionId;
        if (!acc[electionId]) {
          acc[electionId] = [];
        }
        acc[electionId].push(result);
        return acc;
      }, {} as Record<string, ElectionResult[]>);

      setResultsByYear(groupedResults);
      setLoadingResults(false);
    }
    fetchAllResults();
  }, [firestore]);


  const getPartyById = (id: string) => parties?.find(p => p.id === id);
  const getConstituencyById = (id: string) => constituencies?.find(c => c.id === id);
  
  const loading = loadingElections || loadingParties || loadingConstituencies || loadingLogos;

  const currentElectionResults = selectedElectionId ? resultsByYear[selectedElectionId] : [];
  const currentElection = useMemo(() => sortedElections.find(e => e.id === selectedElectionId), [selectedElectionId, sortedElections]);

  const previousElection = useMemo(() => {
    if (!currentElection || !sortedElections) return null;
    const currentIndex = sortedElections.findIndex(e => e.id === currentElection.id);
    return sortedElections[currentIndex + 1] || null;
  }, [currentElection, sortedElections]);

  const previousElectionResults = previousElection ? resultsByYear[previousElection.id] : [];


  const summaryData = useMemo(() => {
    if (!currentElectionResults || !parties || !constituencies || !partyLogos) return [];
  
    const slp = parties.find(p => p.acronym === 'SLP');
    const uwp = parties.find(p => p.acronym === 'UWP');
  
    if (!slp || !uwp) return [];
  
    let slpSeats = 0;
    let uwpSeats = 0;
    let otherSeats = 0;
  
    let slpVotes = 0;
    let uwpVotes = 0;
    let otherVotes = 0;

    const is2021 = currentElection?.year === 2021;
  
    currentElectionResults.forEach(result => {
      const constituency = getConstituencyById(result.constituencyId);
      const isSpecialConstituency = is2021 && (constituency?.name === 'Castries North' || constituency?.name === 'Castries Central');

      if (isSpecialConstituency) {
        otherVotes += result.slpVotes; // Add SLP votes to 'Other' for IND
        uwpVotes += result.uwpVotes;
        otherVotes += result.otherVotes;
        otherSeats++; // Add SLP seat to 'Other' for IND
      } else {
        slpVotes += result.slpVotes;
        uwpVotes += result.uwpVotes;
        otherVotes += result.otherVotes;

        if (result.slpVotes > result.uwpVotes) {
            slpSeats++;
        } else if (result.uwpVotes > result.slpVotes) {
            uwpSeats++;
        }
      }
    });

    const getElectionLogo = (partyId: string) => {
        const electionLogo = partyLogos.find(logo => logo.partyId === partyId && logo.electionId === currentElection?.id);
        const party = getPartyById(partyId);

        let logoUrl = electionLogo?.expandedLogoUrl || electionLogo?.logoUrl || party?.expandedLogoUrl || party?.logoUrl;

        if (currentElection && currentElection.year < 1997) {
            logoUrl = electionLogo?.logoUrl || party?.oldLogoUrl || party?.logoUrl;
        }

        return logoUrl;
    }

    const calculatePreviousSeats = (partyId: string) => {
      if (!previousElectionResults) return 0;
      return previousElectionResults.reduce((acc, result) => {
        const party = getPartyById(partyId);
        if (!party) return acc;
        if (party.acronym === 'SLP' && result.slpVotes > result.uwpVotes) return acc + 1;
        if (party.acronym === 'UWP' && result.uwpVotes > result.slpVotes) return acc + 1;
        return acc;
      }, 0);
    }

    const getSeatChange = (partyId: string, currentSeats: number) => {
        if (!previousElection) return null;
        const prevSeats = calculatePreviousSeats(partyId);
        return currentSeats - prevSeats;
    }
  
    const summary = [
        { partyId: slp.id, name: slp.acronym, acronym: slp.acronym, seats: slpSeats, totalVotes: slpVotes, color: slp.color, logoUrl: getElectionLogo(slp.id), seatChange: getSeatChange(slp.id, slpSeats) },
        { partyId: uwp.id, name: uwp.acronym, acronym: uwp.acronym, seats: uwpSeats, totalVotes: uwpVotes, color: uwp.color, logoUrl: getElectionLogo(uwp.id), seatChange: getSeatChange(uwp.id, uwpSeats) },
    ];
    
    if(otherVotes > 0 || otherSeats > 0) {
        const independentLogo = partyLogos.find(logo => logo.partyId === 'independent' && logo.electionId === currentElection?.id);
        summary.push({ partyId: 'other', name: 'INDEPENDENTS', acronym: 'IND', seats: otherSeats, totalVotes: otherVotes, color: '#8884d8', logoUrl: independentLogo?.expandedLogoUrl || independentLogo?.logoUrl || currentElection?.independentExpandedLogoUrl || currentElection?.independentLogoUrl, seatChange: null });
    }

    return summary.filter(p => p.seats > 0 || p.totalVotes > 0)
     .sort((a,b) => b.seats - a.seats || b.totalVotes - a.totalVotes);
  }, [currentElectionResults, parties, constituencies, currentElection, partyLogos, previousElectionResults, previousElection]);


  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    if (summaryData) {
        summaryData.forEach(item => {
            config[item.acronym] = {
                label: item.acronym,
                color: item.color,
            }
        });
    }
    return config;
  }, [summaryData]);
  
  const voteDistributionData = useMemo(() => {
    const totalVotes = summaryData.reduce((acc, p) => acc + p.totalVotes, 0);
    if(totalVotes === 0) return [];
    return [{
        name: 'Votes',
        ...summaryData.reduce((acc, p) => {
            acc[p.acronym] = p.totalVotes;
            return acc;
        }, {} as Record<string, number>)
    }];
  }, [summaryData]);
  
  const handleYearChange = (electionId: string) => {
    setSelectedElectionId(electionId);
    router.push(`/results?year=${electionId}`);
  };

  const resultsMapConstituencies = useMemo(() => {
    if (!constituencies || !currentElectionResults) return [];

    return constituencies.map(con => {
        const result = currentElectionResults.find(r => r.constituencyId === con.id);
        if (result) {
            let winner = 'tossup';
             const is2021 = currentElection?.year === 2021;
             if (is2021 && (con.name === 'Castries North' || con.name === 'Castries Central')) {
                winner = result.slpVotes > result.uwpVotes ? 'solid-slp' : 'solid-uwp'; // SLP votes are IND here
             }
            
            if (winner === 'tossup') {
              winner = result.slpVotes > result.uwpVotes ? 'solid-slp' : 'solid-uwp';
            }

            return { ...con, politicalLeaning: winner as Constituency['politicalLeaning'] };
        }
        return { ...con, politicalLeaning: 'tossup' }; // Default for no result
    });
  }, [constituencies, currentElectionResults, currentElection]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Past Election Results"
        />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Past Election Results"
      />
      <div className="mb-6 flex justify-end">
          <Select value={selectedElectionId} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select an election year" />
              </SelectTrigger>
              <SelectContent>
                  {sortedElections.map(election => (
                      <SelectItem key={election.id} value={election.id}>
                          {election.name}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
      </div>
      <Card>
        <CardContent className="p-6">
            {!selectedElectionId || !currentElection ? (
                <div className="text-center py-12 text-muted-foreground">Please select an election to view results.</div>
            ) : (
                <div className="mt-6">
                  <h3 className="text-2xl font-headline mb-4">
                    {currentElection.name} Election Summary
                  </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <h4 className="text-lg font-semibold mb-2">Seat Distribution</h4>
                             <div className="grid gap-4" style={{gridTemplateColumns: `repeat(${summaryData.length}, minmax(0, 1fr))`}}>
                                {summaryData.map((summaryItem) => (
                                <Card key={summaryItem.partyId} style={{ borderLeftColor: summaryItem.color, borderLeftWidth: '4px' }}>
                                    <CardHeader className="flex flex-col items-center text-center p-4">
                                    <CardTitle className="text-base">{summaryItem.name}</CardTitle>
                                    {summaryItem.logoUrl && (
                                        <div className="relative h-12 w-12 mt-2">
                                            <Image src={summaryItem.logoUrl} alt={`${summaryItem.name} logo`} fill className="object-contain" />
                                        </div>
                                    )}
                                    </CardHeader>
                                    <CardContent className="text-center p-4">
                                    <div className="text-2xl font-bold">{summaryItem.seats} Seats</div>
                                        {summaryItem.seatChange !== null && (
                                            <p className={`flex items-center justify-center gap-1 text-xs font-semibold ${summaryItem.seatChange > 0 ? 'text-green-600' : summaryItem.seatChange < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                {summaryItem.seatChange > 0 ? <ArrowUp className="h-3 w-3" /> : summaryItem.seatChange < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                                {summaryItem.seatChange > 0 ? `+${summaryItem.seatChange}` : summaryItem.seatChange} seats
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                                ))}
                            </div>
                        </div>
                        
                        {summaryData.length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold mb-2">Vote Distribution</h4>
                                <Card>
                                <CardContent className="pt-6">
                                    <ChartContainer config={chartConfig} className="h-12 w-full">
                                        <ResponsiveContainer>
                                        <BarChart layout="vertical" data={voteDistributionData} stackOffset="expand">
                                            <YAxis type="category" dataKey="name" hide />
                                            <Tooltip
                                                cursor={false}
                                                content={<ChartTooltipContent 
                                                    hideLabel 
                                                    formatter={(value, name, item) => (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full" style={{backgroundColor: item.color}}/>
                                                            <div className="flex justify-between w-full">
                                                                <span>{name}</span>
                                                                <span className="font-bold ml-4">{(value as number).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                />}
                                            />
                                            {summaryData.map(p => (
                                                <Bar key={p.partyId} dataKey={p.acronym} fill={p.color} stackId="a" radius={0}>
                                                    <LabelList 
                                                        position="inside"
                                                        formatter={(value: number) => value.toLocaleString()}
                                                        className="fill-white font-bold text-sm"
                                                    />
                                                </Bar>
                                            ))}
                                        </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                      <div className="mt-4 flex justify-around text-xs text-center">
                                        {summaryData.map(p => (
                                            <div key={p.partyId} className="flex flex-col items-center gap-1">
                                                {p.logoUrl && <Image src={p.logoUrl} alt={`${p.name} logo`} width={24} height={24} className="object-contain" />}
                                                <span className="font-semibold">{p.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2">
                        <h3 className="text-2xl font-headline mb-6">Constituency Breakdown</h3>
                        {loadingResults ? <p>Loading results...</p> : (
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Constituency</TableHead>
                                    <TableHead>Result</TableHead>
                                    <TableHead>SLP Votes</TableHead>
                                    <TableHead>UWP Votes</TableHead>
                                    <TableHead>Other Votes</TableHead>
                                    <TableHead className="text-right">Total Votes</TableHead>
                                    <TableHead className="text-right">Registered Voters</TableHead>
                                    <TableHead className="text-right">Turnout</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {currentElectionResults && currentElectionResults.length > 0 ? currentElectionResults.map((cr) => {
                                    const constituency = getConstituencyById(cr.constituencyId);
                                    const is2021 = currentElection?.year === 2021;
                                    
                                    let currentWinner = cr.slpVotes > cr.uwpVotes ? 'SLP' : 'UWP';
                                    if (is2021 && (constituency?.name === 'Castries North' || constituency?.name === 'Castries Central')) {
                                        currentWinner = 'IND';
                                    }
                                    
                                    const previousResult = previousElectionResults?.find(r => r.constituencyId === cr.constituencyId);
                                    const previousWinner = previousResult ? (previousResult.slpVotes > previousResult.uwpVotes ? 'SLP' : 'UWP') : null;

                                    let resultStatus = `${currentWinner} Win`;
                                    if (previousWinner) {
                                        if (currentWinner === 'IND') {
                                            resultStatus = 'IND Gain';
                                        } else if (currentWinner === previousWinner) {
                                            resultStatus = `${currentWinner} Hold`;
                                        } else {
                                            resultStatus = `${currentWinner} Gain`;
                                        }
                                    }

                                    const slpParty = parties?.find(p => p.acronym === 'SLP');
                                    const uwpParty = parties?.find(p => p.acronym === 'UWP');
                                    const winnerColor = currentWinner === 'SLP' ? slpParty?.color : (currentWinner === 'UWP' ? uwpParty?.color : '#8884d8');

                                    return (
                                    <TableRow key={cr.id} onClick={() => setSelectedConstituencyId(cr.constituencyId)} className={selectedConstituencyId === cr.constituencyId ? 'bg-muted' : ''}>
                                        <TableCell className="font-medium">{constituency?.name || cr.constituencyId}</TableCell>
                                        <TableCell>
                                            <span className="font-semibold" style={{ color: winnerColor }}>{resultStatus}</span>
                                        </TableCell>
                                        <TableCell>{cr.slpVotes.toLocaleString()}</TableCell>
                                        <TableCell>{cr.uwpVotes.toLocaleString()}</TableCell>
                                        <TableCell>{cr.otherVotes.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-semibold">{cr.totalVotes.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{cr.registeredVoters === 0 ? 'N/A' : cr.registeredVoters.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{cr.turnout === 0 ? 'N/A' : `${cr.turnout}%`}</TableCell>
                                    </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground h-24">Detailed constituency data not available for this year.</TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        )}
                     </div>
                     <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Results Map</CardTitle>
                                <CardDescription>Constituency winners for {currentElection.name}.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-2">
                                <InteractiveSvgMap 
                                    constituencies={resultsMapConstituencies}
                                    selectedConstituencyId={selectedConstituencyId}
                                    onConstituencyClick={setSelectedConstituencyId}
                                    election={currentElection}
                                    electionResults={currentElectionResults}
                                    previousElectionResults={previousElectionResults}
                                />
                            </CardContent>
                        </Card>
                    </div>
                  </div>
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  );
}
