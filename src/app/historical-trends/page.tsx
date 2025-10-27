
'use client';

import { useState, useMemo } from 'react';
import type { Election, ElectionResult, Party, Constituency, Region } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        </div>
      )}
    </div>
  );
}
