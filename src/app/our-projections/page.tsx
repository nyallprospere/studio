
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

  const getConfidenceBadgeVariant = (confidence?: 'High' | 'Medium' | 'Low'): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (confidence) {
      case 'High':
        return 'default';
      case 'Medium':
        return 'secondary';
      case 'Low':
        return 'outline';
      default:
        return 'secondary';
    }
  }

  const getPartyColorClass = (party?: 'slp' | 'uwp' | 'ind') => {
    switch (party) {
        case 'slp': return 'text-red-600 font-bold';
        case 'uwp': return 'text-yellow-500 font-bold';
        case 'ind': return 'text-blue-500 font-bold';
        default: return 'text-muted-foreground';
    }
  }

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
                        <TableHead>Forecasted Vote %</TableHead>
                        <TableHead>Confidence</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedConstituencies.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className={cn(getPartyColorClass(c.aiForecastParty))}>
                                  {c.aiForecastParty?.toUpperCase() || 'N/A'}
                                </TableCell>
                                <TableCell>{c.aiForecast ? `${c.aiForecast.toFixed(1)}%` : 'N/A'}</TableCell>
                                <TableCell>
                                  {c.aiConfidence ? (
                                    <Badge variant={getConfidenceBadgeVariant(c.aiConfidence)}>
                                      {c.aiConfidence}
                                    </Badge>
                                  ) : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
