

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Election, ElectionResult, Party, Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, orderBy, query, getDocs } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';


export default function ResultsPage() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const yearFromQuery = searchParams.get('year');

  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  
  const [selectedElectionId, setSelectedElectionId] = useState<string | undefined>(undefined);
  const [resultsByYear, setResultsByYear] = useState<Record<string, ElectionResult[]>>({});
  const [loadingResults, setLoadingResults] = useState(true);
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);

  const sortedElections = useMemo(() => {
    if (!elections) return [];
    return [...elections].sort((a, b) => {
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
  
  const loading = loadingElections || loadingParties || loadingConstituencies;

  const currentElectionResults = selectedElectionId ? resultsByYear[selectedElectionId] : [];
  const currentElection = useMemo(() => sortedElections.find(e => e.id === selectedElectionId), [selectedElectionId, sortedElections]);

  const previousElection = useMemo(() => {
    if (!currentElection || !sortedElections) return null;
    const currentIndex = sortedElections.findIndex(e => e.id === currentElection.id);
    return sortedElections[currentIndex + 1] || null;
  }, [currentElection, sortedElections]);

  const previousElectionResults = previousElection ? resultsByYear[previousElection.id] : [];


  const summaryData = useMemo(() => {
    if (!currentElectionResults || !parties || !constituencies) return [];
  
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
    const castriesNorth = constituencies.find(c => c.name === 'Castries North');
    const castriesCentral = constituencies.find(c => c.name === 'Castries Central');
  
    currentElectionResults.forEach(result => {
      const constituency = getConstituencyById(result.constituencyId);
      const isSpecialConstituency = is2021 && (constituency?.id === castriesNorth?.id || constituency?.id === castriesCentral?.id);

      if (isSpecialConstituency) {
        otherVotes += result.slpVotes; // Add SLP votes to 'Other'
        uwpVotes += result.uwpVotes;
        otherVotes += result.otherVotes;
        if (result.slpVotes > result.uwpVotes) {
          otherSeats++; // Add SLP seat to 'Other'
        } else if (result.uwpVotes > result.slpVotes) {
          uwpSeats++;
        }
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
  
    const summary = [
        { partyId: slp.id, name: slp.name, acronym: slp.acronym, seats: slpSeats, totalVotes: slpVotes, color: slp.color, logoUrl: currentElection && currentElection.year < 1997 ? slp.oldLogoUrl || slp.logoUrl : slp.expandedLogoUrl || slp.logoUrl },
        { partyId: uwp.id, name: uwp.name, acronym: uwp.acronym, seats: uwpSeats, totalVotes: uwpVotes, color: uwp.color, logoUrl: currentElection && currentElection.year < 1997 ? uwp.oldLogoUrl || uwp.logoUrl : uwp.expandedLogoUrl || uwp.logoUrl },
    ];
    
    if(otherVotes > 0 || otherSeats > 0) {
        summary.push({ partyId: 'other', name: 'INDEPENDENTS', acronym: 'IND', seats: otherSeats, totalVotes: otherVotes, color: '#8884d8', logoUrl: undefined });
    }

    return summary.filter(p => p.seats > 0 || p.totalVotes > 0)
     .sort((a,b) => b.seats - a.seats || b.totalVotes - a.totalVotes);
  }, [currentElectionResults, parties, constituencies, currentElection]);


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
  
  const handleYearChange = (electionId: string) => {
    setSelectedElectionId(electionId);
    router.push(`/results?year=${electionId}`);
  };

  const resultsMapConstituencies = useMemo(() => {
    if (!constituencies || !currentElectionResults) return [];

    return constituencies.map(con => {
        const result = currentElectionResults.find(r => r.constituencyId === con.id);
        if (result) {
            const winner = result.slpVotes > result.uwpVotes ? 'solid-slp' : 'solid-uwp';
            return { ...con, politicalLeaning: winner };
        }
        return { ...con, politicalLeaning: 'tossup' }; // Default for no result
    });
  }, [constituencies, currentElectionResults]);


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

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {summaryData.map((summaryItem) => (
                      <Card key={summaryItem.partyId} style={{ borderLeftColor: summaryItem.color, borderLeftWidth: '4px' }}>
                        <CardHeader className="flex flex-col items-center text-center">
                          <CardTitle className="text-lg">{summaryItem.name}</CardTitle>
                          {summaryItem.logoUrl && (
                            <div className="relative h-24 w-24 mt-2">
                                <Image src={summaryItem.logoUrl} alt={`${summaryItem.name} logo`} fill className="object-contain" />
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="text-center">
                          <div className="text-3xl font-bold">{summaryItem.seats} Seats</div>
                          <p className="text-sm text-muted-foreground">
                            {summaryItem.totalVotes.toLocaleString()} votes
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {summaryData.length > 0 && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Seat Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-40 w-full">
                                <ResponsiveContainer>
                                    <BarChart data={summaryData} layout="vertical" margin={{left: 30}}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="acronym" type="category" hide/>
                                        <ChartTooltip 
                                            cursor={false}
                                            content={<ChartTooltipContent 
                                                formatter={(value, name) => [`${value} seats`, name]}
                                                indicator="dot" 
                                            />}
                                        />
                                        <Bar dataKey="seats" stackId="a" radius={[0, 4, 4, 0]}>
                                            {summaryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                            <LabelList
                                                dataKey="logoUrl"
                                                position="insideLeft"
                                                offset={10}
                                                content={({ value, x, y, width, height }) => 
                                                    value ? (
                                                        <foreignObject x={(x || 0) - 25} y={(y || 0) - 5} width={30} height={30}>
                                                          <Image src={value} alt="logo" width={30} height={30} className="object-contain bg-transparent" />
                                                        </foreignObject>
                                                    ) : null
                                                }
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                  )}

                  <h3 className="text-2xl font-headline my-6">Constituency Breakdown</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
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
                                        const currentWinner = cr.slpVotes > cr.uwpVotes ? 'SLP' : 'UWP';
                                        
                                        const previousResult = previousElectionResults?.find(r => r.constituencyId === cr.constituencyId);
                                        const previousWinner = previousResult ? (previousResult.slpVotes > previousResult.uwpVotes ? 'SLP' : 'UWP') : null;

                                        let resultStatus = `${currentWinner} Win`;
                                        if (previousWinner) {
                                            if (currentWinner === previousWinner) {
                                                resultStatus = `${currentWinner} Hold`;
                                            } else {
                                                resultStatus = `${currentWinner} Gain`;
                                            }
                                        }

                                        const slpParty = parties?.find(p => p.acronym === 'SLP');
                                        const uwpParty = parties?.find(p => p.acronym === 'UWP');
                                        const winnerColor = currentWinner === 'SLP' ? slpParty?.color : uwpParty?.color;
                                        
                                        const is2021 = currentElection?.year === 2021;
                                        const isSpecialConstituency = is2021 && (constituency?.name === 'Castries North' || constituency?.name === 'Castries Central');


                                        return (
                                        <TableRow key={cr.id} onClick={() => setSelectedConstituencyId(cr.constituencyId)} className={selectedConstituencyId === cr.constituencyId ? 'bg-muted' : ''}>
                                            <TableCell className="font-medium">{constituency?.name || cr.constituencyId}</TableCell>
                                            <TableCell>
                                                <span className="font-semibold" style={{ color: winnerColor }}>{resultStatus}</span>
                                            </TableCell>
                                            <TableCell>{isSpecialConstituency ? '-' : cr.slpVotes.toLocaleString()}</TableCell>
                                            <TableCell>{cr.uwpVotes.toLocaleString()}</TableCell>
                                            <TableCell>{isSpecialConstituency ? (cr.slpVotes + cr.otherVotes).toLocaleString() : cr.otherVotes.toLocaleString()}</TableCell>
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
                        <div>
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
