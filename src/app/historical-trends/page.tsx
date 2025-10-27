
'use client';

import { useState, useMemo } from 'react';
import type { Election, ElectionResult, Party, Constituency, Region } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis, Label, ReferenceLine } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NationalSeatTrend = ({ elections, results, parties }: { elections: Election[], results: ElectionResult[], parties: Party[] }) => {
  const chartData = useMemo(() => {
    if (!elections.length || !results.length || !parties.length) return [];
    
    return elections
      .filter(e => e.year < 2026) // Exclude future elections
      .sort((a,b) => a.year - b.year)
      .map(election => {
        const electionResults = results.filter(r => r.electionId === election.id);
        const slp = parties.find(p => p.acronym === 'SLP');
        const uwp = parties.find(p => p.acronym === 'UWP');

        let yearData: any = { year: election.year };

        if(slp) {
          yearData[slp.acronym] = electionResults.filter(r => r.slpVotes > r.uwpVotes).length;
        }
        if(uwp) {
          yearData[uwp.acronym] = electionResults.filter(r => r.uwpVotes > r.slpVotes).length;
        }
        return yearData;
    });

  }, [elections, results, parties]);
  
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    if (parties) {
      const slp = parties.find(p => p.acronym === 'SLP');
      const uwp = parties.find(p => p.acronym === 'UWP');
      if (slp) config[slp.acronym] = { label: 'SLP', color: slp.color };
      if (uwp) config[uwp.acronym] = { label: 'UWP', color: uwp.color };
    }
    return config;
  }, [parties]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>National Seat Distribution Over Time</CardTitle>
        <CardDescription>Number of seats won by each major party in past elections.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer>
                <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    {Object.keys(chartConfig).map(key => (
                        <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const NationalVoteTrend = ({ elections, results, parties, constituencies, selectedConstituencyId, setSelectedConstituencyId }: { elections: Election[], results: ElectionResult[], parties: Party[], constituencies: Constituency[], selectedConstituencyId: string, setSelectedConstituencyId: (id: string) => void }) => {
  const chartData = useMemo(() => {
     if (!elections.length || !results.length || !parties.length) return [];
    
    return elections
      .filter(e => e.year < 2026)
      .sort((a,b) => a.year - b.year)
      .map(election => {
        let electionResults = results.filter(r => r.electionId === election.id);

        if (selectedConstituencyId !== 'national') {
            electionResults = electionResults.filter(r => r.constituencyId === selectedConstituencyId);
        }

        const slp = parties.find(p => p.acronym === 'SLP');
        const uwp = parties.find(p => p.acronym === 'UWP');

        let yearData: any = { year: election.year };
        let totalVotes = 0;
        let slpVotes = 0;
        let uwpVotes = 0;
        let otherVotes = 0;

        electionResults.forEach(r => {
          totalVotes += r.totalVotes;
          slpVotes += r.slpVotes;
          uwpVotes += r.uwpVotes;
          otherVotes += r.otherVotes;
        });

        if (totalVotes === 0) return { year: election.year };

        if(slp) yearData[slp.acronym] = parseFloat(((slpVotes / totalVotes) * 100).toFixed(1));
        if(uwp) yearData[uwp.acronym] = parseFloat(((uwpVotes / totalVotes) * 100).toFixed(1));
        yearData['IND'] = parseFloat(((otherVotes / totalVotes) * 100).toFixed(1));
        
        return yearData;
    });
  }, [elections, results, parties, selectedConstituencyId]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    if (parties) {
      const slp = parties.find(p => p.acronym === 'SLP');
      const uwp = parties.find(p => p.acronym === 'UWP');
      if (slp) config[slp.acronym] = { label: 'SLP', color: slp.color };
      if (uwp) config[uwp.acronym] = { label: 'UWP', color: uwp.color };
      config['IND'] = { label: 'IND', color: '#3b82f6' };
    }
    return config;
  }, [parties]);
  
  const selectedConstituencyName = selectedConstituencyId === 'national' 
    ? 'National' 
    : constituencies.find(c => c.id === selectedConstituencyId)?.name || 'National';


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Popular Vote (%) Over Time</CardTitle>
                <CardDescription>Percentage of the popular vote for {selectedConstituencyName}.</CardDescription>
            </div>
            <Select value={selectedConstituencyId} onValueChange={setSelectedConstituencyId}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Constituency" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    {constituencies.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer>
                <LineChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Legend />
                     {Object.keys(chartConfig).map(key => (
                        <Line key={key} dataKey={key} type="monotone" stroke={`var(--color-${key})`} strokeWidth={2} dot={false} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const VoterTurnoutTrend = ({ elections, results, constituencies, selectedConstituencyId, setSelectedConstituencyId }: { elections: Election[], results: ElectionResult[], constituencies: Constituency[], selectedConstituencyId: string, setSelectedConstituencyId: (id: string) => void }) => {
  const chartData = useMemo(() => {
    if (!elections.length || !results.length) return [];
    
    return elections
      .filter(e => e.year < 2026 && e.year !== 1987)
      .sort((a,b) => a.year - b.year)
      .map(election => {
        let electionResults = results.filter(r => r.electionId === election.id);
        
        if (selectedConstituencyId !== 'national') {
            electionResults = electionResults.filter(r => r.constituencyId === selectedConstituencyId);
        }

        let totalVotes = 0;
        let registeredVoters = 0;

        electionResults.forEach(r => {
            if(r.registeredVoters > 0) {
              totalVotes += r.totalVotes;
              registeredVoters += r.registeredVoters;
            }
        });
        
        const turnout = registeredVoters > 0 ? parseFloat(((totalVotes / registeredVoters) * 100).toFixed(1)) : null;

        return { year: election.year, Turnout: turnout };
    }).filter(d => d.Turnout !== null);
  }, [elections, results, selectedConstituencyId]);

  const chartConfig = {
    Turnout: { label: 'Turnout', color: 'hsl(var(--primary))' },
  };

  const selectedConstituencyName = selectedConstituencyId === 'national' 
    ? 'National' 
    : constituencies.find(c => c.id === selectedConstituencyId)?.name || 'National';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle>Voter Turnout (%) Over Time</CardTitle>
              <CardDescription>Percentage of registered voters who cast a ballot for {selectedConstituencyName}.</CardDescription>
            </div>
            <Select value={selectedConstituencyId} onValueChange={setSelectedConstituencyId}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Constituency" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    {constituencies.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer>
                <LineChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Legend />
                    <Line dataKey="Turnout" type="monotone" stroke="var(--color-Turnout)" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const SwingAnalysisScatterPlot = ({ elections, results, constituencies, parties }: { elections: Election[], results: ElectionResult[], constituencies: Constituency[], parties: Party[] }) => {
  const [selectedElectionId, setSelectedElectionId] = useState<string>('all');
  
  const sortedElections = useMemo(() => elections.filter(e => e.year < 2026).sort((a, b) => b.year - a.year), [elections]);

  const { chartData, nationalSwing } = useMemo(() => {
    if (!elections.length || !results.length || !constituencies.length || !parties.length) return { chartData: [], nationalSwing: 0 };

    const dataByElection = (electionId: string) => {
        const currentElection = sortedElections.find(e => e.id === electionId);
        const prevElectionIndex = sortedElections.findIndex(e => e.id === electionId) + 1;
        const prevElection = sortedElections[prevElectionIndex];

        if (!currentElection || !prevElection) return { data: [], nationalSwing: 0 };

        const currentResults = results.filter(r => r.electionId === electionId);
        const prevResults = results.filter(r => r.electionId === prevElection.id);

        const slp = parties.find(p => p.acronym === 'SLP');
        if (!slp) return { data: [], nationalSwing: 0 };

        const calcPercentage = (votes: number, total: number) => total > 0 ? (votes / total) * 100 : 0;
        
        const nationalCurrentSLP = currentResults.reduce((sum, r) => sum + r.slpVotes, 0);
        const nationalCurrentTotal = currentResults.reduce((sum, r) => sum + r.totalVotes, 0);
        const nationalCurrentSLPPercent = calcPercentage(nationalCurrentSLP, nationalCurrentTotal);
        
        const nationalPrevSLP = prevResults.reduce((sum, r) => sum + r.slpVotes, 0);
        const nationalPrevTotal = prevResults.reduce((sum, r) => sum + r.totalVotes, 0);
        const nationalPrevSLPPercent = calcPercentage(nationalPrevSLP, nationalPrevTotal);

        const nationalSwing = nationalCurrentSLPPercent - nationalPrevSLPPercent;

        const data = constituencies.map(con => {
            const currentConResult = currentResults.find(r => r.constituencyId === con.id);
            const prevConResult = prevResults.find(r => r.constituencyId === con.id);
            if (!currentConResult || !prevConResult) return null;
            
            const currentConSLPPercent = calcPercentage(currentConResult.slpVotes, currentConResult.totalVotes);
            const prevConSLPPercent = calcPercentage(prevConResult.slpVotes, prevConResult.totalVotes);
            
            const constituencySwing = currentConSLPPercent - prevConSLPPercent;

            return {
              name: con.name,
              y: constituencySwing,
              x: constituencySwing - nationalSwing,
              year: currentElection.year,
            };
        }).filter((d): d is NonNullable<typeof d> => d !== null);

        return { data, nationalSwing };
    };

    if (selectedElectionId === 'all') {
        const allData = sortedElections.flatMap(e => dataByElection(e.id).data);
        return { chartData: allData, nationalSwing: 0 }; // National swing line doesn't make sense for 'all'
    }

    const { data, nationalSwing } = dataByElection(selectedElectionId);
    return { chartData: data, nationalSwing };

  }, [elections, results, constituencies, parties, selectedElectionId, sortedElections]);

  const chartConfig: ChartConfig = {
    swing: { label: "Swing (%)", color: "hsl(var(--primary))" },
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border p-2 rounded-md shadow-lg text-sm">
          <p className="font-bold">{data.name} ({data.year})</p>
          <p>Constituency Swing (Y): {data.y.toFixed(1)}%</p>
          <p>Swing vs National (X): {data.x.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle>Constituency Swing Quadrant Analysis</CardTitle>
              <CardDescription>How each constituency's SLP and UWP vote swing compares to the national trend.</CardDescription>
            </div>
            <Select value={selectedElectionId} onValueChange={setSelectedElectionId}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Election" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Elections</SelectItem>
                    {sortedElections.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
         <ChartContainer config={chartConfig} className="h-[450px] w-full">
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="x" name="Swing vs. National" unit="%" domain={['dataMin - 2', 'dataMax + 2']}>
                        <Label value="Constituency swing relative to national swing" offset={-25} position="insideBottom" />
                    </XAxis>
                    <YAxis type="number" dataKey="y" name="Constituency Swing" unit="%">
                        <Label value="Constituency Swing" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                    </YAxis>
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
                    <ReferenceLine x={0} stroke="#888" strokeDasharray="3 3" />
                    {nationalSwing !== 0 && (
                      <ReferenceLine y={nationalSwing} label={{ value: 'National Trend', position: 'insideTopLeft' }} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                    )}
                    <Scatter name="Constituencies" data={chartData} fill="hsl(var(--primary))" />
                    
                    <Label value="SLP Gain, UWP Loss (Above National Trend)" position="insideTopRight" offset={10} fill="gray" fontSize="12" />
                    <Label value="SLP Loss, UWP Gain (Above National Trend)" position="insideBottomRight" offset={10} fill="gray" fontSize="12" />
                    <Label value="SLP Loss, UWP Gain (Below National Trend)" position="insideBottomLeft" offset={10} fill="gray" fontSize="12" />
                    <Label value="SLP Gain, UWP Loss (Below National Trend)" position="insideTopLeft" offset={10} fill="gray" fontSize="12" />
                </ScatterChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}


export default function HistoricalTrendsPage() {
  const { firestore } = useFirebase();
  const [selectedConstituencyId, setSelectedConstituencyId] = useState('national');

  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const resultsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'election_results') : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: results, isLoading: loadingResults } = useCollection<ElectionResult>(resultsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

  const isLoading = loadingElections || loadingResults || loadingParties || loadingConstituencies;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Historical Trends"
        description="Visualize election results from past years."
      />
      {isLoading ? (
        <p>Loading historical data...</p>
      ) : (
        <div className="space-y-8">
          <NationalSeatTrend elections={elections || []} results={results || []} parties={parties || []} />
          <NationalVoteTrend 
            elections={elections || []} 
            results={results || []} 
            parties={parties || []} 
            constituencies={constituencies || []} 
            selectedConstituencyId={selectedConstituencyId}
            setSelectedConstituencyId={setSelectedConstituencyId}
          />
          <VoterTurnoutTrend 
            elections={elections || []} 
            results={results || []}
            constituencies={constituencies || []}
            selectedConstituencyId={selectedConstituencyId}
            setSelectedConstituencyId={setSelectedConstituencyId}
          />
          <SwingAnalysisScatterPlot
            elections={elections || []}
            results={results || []}
            constituencies={constituencies || []}
            parties={parties || []}
          />
        </div>
      )}
    </div>
  );
}
