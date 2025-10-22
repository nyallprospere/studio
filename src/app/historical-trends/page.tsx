
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

const NationalVoteTrend = ({ elections, results, parties }: { elections: Election[], results: ElectionResult[], parties: Party[] }) => {
  const chartData = useMemo(() => {
     if (!elections.length || !results.length || !parties.length) return [];
    
    return elections
      .filter(e => e.year < 2026)
      .sort((a,b) => a.year - b.year)
      .map(election => {
        const electionResults = results.filter(r => r.electionId === election.id);
        const slp = parties.find(p => p.acronym === 'SLP');
        const uwp = parties.find(p => p.acronym === 'UWP');

        let yearData: any = { year: election.year };
        let totalVotes = 0;
        let slpVotes = 0;
        let uwpVotes = 0;

        electionResults.forEach(r => {
          totalVotes += r.totalVotes;
          slpVotes += r.slpVotes;
          uwpVotes += r.uwpVotes;
        });

        if(slp) yearData[slp.acronym] = totalVotes > 0 ? parseFloat(((slpVotes / totalVotes) * 100).toFixed(1)) : 0;
        if(uwp) yearData[uwp.acronym] = totalVotes > 0 ? parseFloat(((uwpVotes / totalVotes) * 100).toFixed(1)) : 0;
        
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
        <CardTitle>National Popular Vote (%) Over Time</CardTitle>
        <CardDescription>Percentage of the popular vote for each major party.</CardDescription>
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

const VoterTurnoutTrend = ({ elections, results }: { elections: Election[], results: ElectionResult[] }) => {
  const chartData = useMemo(() => {
    if (!elections.length || !results.length) return [];
    
    return elections
      .filter(e => e.year < 2026 && e.year !== 1987)
      .sort((a,b) => a.year - b.year)
      .map(election => {
        const electionResults = results.filter(r => r.electionId === election.id);
        
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
  }, [elections, results]);

  const chartConfig = {
    Turnout: { label: 'Turnout', color: 'hsl(var(--primary))' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>National Voter Turnout (%) Over Time</CardTitle>
        <CardDescription>Percentage of registered voters who cast a ballot in past elections.</CardDescription>
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

  const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
  const resultsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'election_results') : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: results, isLoading: loadingResults } = useCollection<ElectionResult>(resultsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

  const isLoading = loadingElections || loadingResults || loadingParties;

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
          <NationalVoteTrend elections={elections || []} results={results || []} parties={parties || []} />
          <VoterTurnoutTrend elections={elections || []} results={results || []} />
        </div>
      )}
    </div>
  );
}
