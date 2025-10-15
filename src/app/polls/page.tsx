'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useCollection } from '@/firebase';
import type { Poll, Party } from '@/lib/types';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';

export default function PollsPage() {
  const { data: polls, loading: loadingPolls } = useCollection<Poll>('polls', { orderBy: ['date', 'asc'] });
  const { data: parties, loading: loadingParties } = useCollection<Party>('parties');

  const chartData = polls?.map(poll => {
    const pollResults: { [key: string]: number | string } = { date: new Date(poll.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
    poll.results.forEach(result => {
      pollResults[result.partyId] = result.percentage;
    });
    return pollResults;
  }) || [];

  const chartConfig: ChartConfig = {};
  parties?.forEach((party, index) => {
    chartConfig[party.id] = {
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
                    dataKey={party.id}
                    type="monotone"
                    stroke={chartConfig[party.id]?.color || '#ccc'}
                    strokeWidth={2}
                    dot={{
                        fill: chartConfig[party.id]?.color,
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
