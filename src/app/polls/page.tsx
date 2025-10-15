'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { Poll, Party } from '@/lib/types';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function PollsPage() {
  const { firestore } = useFirebase();

  const pollsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'polling_data') : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);

  const { data: polls, isLoading: loadingPolls } = useCollection<Poll>(pollsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

  const chartData = polls?.map(poll => {
    const pollResults: { [key: string]: number | string } = { date: new Date(poll.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
    poll.results.forEach(result => {
        const party = parties?.find(p => p.id === result.partyId);
        if (party) {
            pollResults[party.acronym] = result.percentage;
        }
    });
    return pollResults;
  }) || [];

  const chartConfig: ChartConfig = {};
  parties?.forEach((party) => {
    chartConfig[party.acronym] = {
      label: party.acronym,
      color: party.color,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Polling Data"
        description="Visualize the latest polling trends for the upcoming election."
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Polling Trends Over Time</CardTitle>
          <CardDescription>National polling averages for major parties.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                {parties?.map((party) => (
                   <Line
                    key={party.id}
                    dataKey={party.acronym}
                    type="monotone"
                    stroke={chartConfig[party.acronym]?.color || '#ccc'}
                    strokeWidth={2}
                    dot={{
                        fill: chartConfig[party.acronym]?.color,
                    }}
                    activeDot={{
                        r: 6,
                    }}
                    />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
