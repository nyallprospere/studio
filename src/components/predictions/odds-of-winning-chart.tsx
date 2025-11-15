
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Constituency, ConstituencyProjection, Party, Region } from '@/lib/types';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

export function OddsOfWinningTrendChart() {
    const { firestore } = useFirebase();
    const [selectedConstituencyId, setSelectedConstituencyId] = useState('national');
    const [date, setDate] = useState<DateRange | undefined>();
    const [datePreset, setDatePreset] = useState('all');

    const projectionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'constituency_projections'), orderBy('date', 'asc'));
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

    const { data: projections, isLoading: loadingProjections } = useCollection<ConstituencyProjection>(projectionsQuery);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]));
    const { data: parties, isLoading: loadingParties } = useCollection<Party>(useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]));
    

    const handleDatePresetChange = (preset: string) => {
        setDatePreset(preset);
        const now = new Date();
        switch (preset) {
            case 'all': setDate(undefined); break;
            case 'day': setDate({ from: startOfDay(now), to: endOfDay(now) }); break;
            case 'week': setDate({ from: startOfWeek(now), to: endOfWeek(now) }); break;
            case 'month': setDate({ from: startOfMonth(now), to: endOfMonth(now) }); break;
            case 'year': setDate({ from: startOfYear(now), to: endOfYear(now) }); break;
            default: setDate(undefined);
        }
    };
    
    const chartData = useMemo(() => {
        if (!projections || !constituencies) return [];
    
        return projections.map(proj => {
            let targetConstituencies = proj.constituencies;
    
            if (selectedConstituencyId !== 'national') {
                targetConstituencies = targetConstituencies.filter(c => c.id === selectedConstituencyId);
            }
    
            let weightedSlpTotal = 0;
            let weightedUwpTotal = 0;
            let weightedIndTotal = 0;
            let totalVoters = 0;
    
            targetConstituencies.forEach(c => {
                const voters = c.demographics?.registeredVoters || 0;
                if (voters > 0) {
                    const slp = c.predictedSlpPercentage || 0;
                    const uwp = c.predictedUwpPercentage || 0;
                    
                    let ind = 0;
                    if (c.politicalLeaning === 'ind' || c.politicalLeaning === 'lean-ind' || c.politicalLeaning === 'solid-ind') {
                        // Assumption: if leaning is IND, one of the main party percentages is actually the IND percentage
                        // This logic needs to be robust. Let's assume SLP % is used for IND in this case.
                        ind = slp;
                    }
                    
                    weightedSlpTotal += slp * voters;
                    weightedUwpTotal += uwp * voters;
                    weightedIndTotal += ind * voters;
                    totalVoters += voters;
                }
            });

            const slpAvg = totalVoters > 0 ? (weightedSlpTotal / totalVoters) : 0;
            const uwpAvg = totalVoters > 0 ? (weightedUwpTotal / totalVoters) : 0;
            const indAvg = totalVoters > 0 ? (weightedIndTotal / totalVoters) : 0;

            const finalSlp = (selectedConstituencyId === 'national' || selectedConstituencyId === 'all') ? slpAvg + indAvg : slpAvg;

            return {
                date: proj.date ? format(proj.date.toDate(), 'MMM d') : '',
                SLP: parseFloat(finalSlp.toFixed(1)),
                UWP: parseFloat(uwpAvg.toFixed(1)),
                IND: parseFloat(indAvg.toFixed(1)),
            };
        });
    }, [projections, selectedConstituencyId, constituencies]);

    const chartConfig = useMemo(() => {
        const slp = parties?.find(p => p.acronym === 'SLP');
        const uwp = parties?.find(p => p.acronym === 'UWP');
        return {
            SLP: { label: 'SLP', color: slp?.color || 'hsl(var(--chart-3))' },
            UWP: { label: 'UWP', color: uwp?.color || 'hsl(var(--chart-2))' },
            IND: { label: 'IND', color: '#3b82f6' },
        } as ChartConfig;
    }, [parties]);
    
    const displayTitle = useMemo(() => {
        if (selectedConstituencyId !== 'national') {
            return constituencies?.find(c => c.id === selectedConstituencyId)?.name || 'Constituency';
        }
        return 'Average';
    }, [selectedConstituencyId, constituencies]);


    if (loadingProjections || loadingConstituencies || loadingParties) return <Skeleton className="h-[500px] w-full" />;

    const showIndLine = selectedConstituencyId !== 'national' && selectedConstituencyId !== 'all';

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Odds of Winning</CardTitle>
                    </div>
                     <div className="flex items-center gap-2 flex-wrap">
                        <Select value={selectedConstituencyId} onValueChange={setSelectedConstituencyId}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Constituency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="national">All Constituencies</SelectItem>
                                {constituencies?.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <ResponsiveContainer>
                        <LineChart data={chartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Legend />
                            <Line dataKey="SLP" type="monotone" stroke={chartConfig.SLP.color} strokeWidth={2} dot={false} />
                            <Line dataKey="UWP" type="monotone" stroke={chartConfig.UWP.color} strokeWidth={2} dot={false} />
                            {showIndLine && <Line dataKey="IND" type="monotone" stroke={chartConfig.IND.color} strokeWidth={2} dot={false} />}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};
