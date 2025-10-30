
'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Constituency } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function OurProjectionsPage() {
  const { firestore } = useFirebase();
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const { data: constituencies, isLoading } = useCollection<Constituency>(constituenciesQuery);

  const sortedConstituencies = useMemo(() => {
    if (!constituencies) return [];
    return [...constituencies].sort((a, b) => a.name.localeCompare(b.name));
  }, [constituencies]);

  const getPartyColorClass = (party?: 'slp' | 'uwp' | 'ind') => {
    switch (party) {
        case 'slp': return 'text-red-600 font-bold';
        case 'uwp': return 'text-yellow-500 font-bold';
        case 'ind': return 'text-blue-500 font-bold';
        default: return 'text-muted-foreground';
    }
  }

  const calculatePercentages = (forecast: number | undefined, party: 'slp' | 'uwp' | 'ind' | undefined) => {
    if (typeof forecast === 'undefined' || !party) {
        return { slp: null, uwp: null };
    }

    if (party === 'ind') {
        return { slp: null, uwp: null }; // Or handle IND percentages if logic exists
    }

    const baseline = 50;
    let slpPercent = baseline;
    let uwpPercent = baseline;

    if (party === 'slp') {
        slpPercent = baseline + forecast / 2;
        uwpPercent = 100 - slpPercent;
    } else if (party === 'uwp') {
        uwpPercent = baseline + forecast / 2;
        slpPercent = 100 - uwpPercent;
    }

    return { slp: slpPercent, uwp: uwpPercent };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Our Projections"
        description="Detailed AI-powered projections for the upcoming 2026 General Elections."
      />
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Constituency Forecast</CardTitle>
            <CardDescription>
              Our AI's prediction for the winner of each constituency based on historical data, trends, and volatility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Constituency</TableHead>
                        <TableHead>Predicted Winner</TableHead>
                        <TableHead>SLP %</TableHead>
                        <TableHead>UWP %</TableHead>
                        <TableHead>Forecasted Vote Advantage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedConstituencies.map((c) => {
                             const { slp, uwp } = calculatePercentages(c.aiForecast, c.aiForecastParty);
                            return (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell className={cn(getPartyColorClass(c.aiForecastParty))}>
                                    {c.aiForecastParty?.toUpperCase() || 'N/A'}
                                    </TableCell>
                                    <TableCell>{slp !== null ? `${slp.toFixed(1)}%` : 'N/A'}</TableCell>
                                    <TableCell>{uwp !== null ? `${uwp.toFixed(1)}%` : 'N/A'}</TableCell>
                                    <TableCell>{c.aiForecast ? `${c.aiForecast > 0 ? '+' : ''}${c.aiForecast.toFixed(1)}%` : 'N/A'}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
