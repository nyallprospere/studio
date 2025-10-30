
'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Constituency, ConstituencyProjection } from '@/lib/types';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';

export default function OurProjectionsPage() {
  const { firestore } = useFirebase();
  const [date, setDate] = useState<DateRange | undefined>();
  const [datePreset, setDatePreset] = useState('day');

  const projectionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'constituency_projections'), orderBy('date', 'desc'));
    if (date?.from) {
        q = query(q, where('date', '>=', Timestamp.fromDate(date.from)));
    }
    if (date?.to) {
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999);
        q = query(q, where('date', '<=', Timestamp.fromDate(toDate)));
    }
    return q;
  }, [firestore, date]);

  const { data: projections, isLoading } = useCollection<ConstituencyProjection>(projectionsQuery);

  const latestProjection = useMemo(() => {
    if (projections && projections.length > 0) {
      return projections[0];
    }
    return null;
  }, [projections]);
  
  const sortedConstituencies = useMemo(() => {
    if (!latestProjection) return [];
    return [...latestProjection.constituencies].sort((a, b) => a.name.localeCompare(b.name));
  }, [latestProjection]);
  
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    switch (preset) {
        case 'all':
            setDate(undefined);
            break;
        case 'day':
            setDate({ from: startOfDay(now), to: endOfDay(now) });
            break;
        case 'week':
            setDate({ from: startOfWeek(now), to: endOfWeek(now) });
            break;
        case 'month':
            setDate({ from: startOfMonth(now), to: endOfMonth(now) });
            break;
        case 'year':
            setDate({ from: startOfYear(now), to: endOfYear(now) });
            break;
        default:
            setDate(undefined);
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

  const calculatePercentages = (forecast: number | undefined, party: 'slp' | 'uwp' | 'ind' | undefined) => {
    if (typeof forecast === 'undefined' || !party) {
        return { slp: null, uwp: null };
    }

    if (party === 'ind') {
        return { slp: null, uwp: null };
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
        description="Detailed projections for the upcoming 2026 General Elections."
      />
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Constituency Forecast</CardTitle>
                    <CardDescription>
                    Our prediction for the winner of each constituency based on historical data, trends, and volatility.
                    </CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-[260px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                date.to ? (
                                    <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={(range) => { setDate(range); setDatePreset('custom'); }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Select value={datePreset} onValueChange={handleDatePresetChange}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="day">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                            <SelectItem value="custom" disabled>Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            ) : sortedConstituencies.length === 0 ? (
                 <div className="text-center py-12">
                    <p className="text-muted-foreground">No projections found for the selected date range.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Constituency</TableHead>
                        <TableHead>SLP %</TableHead>
                        <TableHead>UWP %</TableHead>
                        <TableHead>Predicted Winner</TableHead>
                        <TableHead>Forecasted Vote Advantage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedConstituencies.map((c) => {
                             const { slp, uwp } = calculatePercentages(c.aiForecast, c.aiForecastParty);
                            return (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>{slp !== null ? `${slp.toFixed(1)}%` : 'N/A'}</TableCell>
                                    <TableCell>{uwp !== null ? `${uwp.toFixed(1)}%` : 'N/A'}</TableCell>
                                    <TableCell className={cn(getPartyColorClass(c.aiForecastParty))}>
                                        {c.aiForecastParty?.toUpperCase() || 'N/A'}
                                    </TableCell>
                                    <TableCell className={cn(getPartyColorClass(c.aiForecastParty))}>{c.aiForecast ? `${c.aiForecast > 0 ? '+' : ''}${c.aiForecast.toFixed(1)}%` : 'N/A'}</TableCell>
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
