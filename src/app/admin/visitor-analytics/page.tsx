'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp, limit } from 'firebase/firestore';
import type { PageView } from '@/lib/types';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';

function VisitorAnalyticsPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader
                title="Visitor Analytics"
                description="Review and analyze your website's traffic."
            />
            <div className="mt-8 grid gap-8">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    );
}


function VisitorAnalyticsPageContent() {
    const { firestore } = useFirebase();
    const [date, setDate] = useState<DateRange | undefined>();
    const [datePreset, setDatePreset] = useState('day');

    useEffect(() => {
        // Set initial date to "Today"
        handleDatePresetChange('day');
    }, []);

    const pageViewsQuery = useMemoFirebase(() => {
        if (!firestore) return null;

        let q = query(collection(firestore, 'page_views'), orderBy('timestamp', 'desc'));
        
        if (date?.from) {
            q = query(q, where('timestamp', '>=', Timestamp.fromDate(date.from)));
        }
        if (date?.to) {
            q = query(q, where('timestamp', '<=', Timestamp.fromDate(date.to)));
        }
        
        q = query(q, limit(100)); // Limit to the most recent 100 entries for performance

        return q;
    }, [firestore, date]);
    
    const { data: pageViews, isLoading } = useCollection<PageView>(pageViewsQuery);

    const chartData = useMemo(() => {
        if (!pageViews) return [];
        const counts = pageViews.reduce((acc, view) => {
            acc[view.path] = (acc[view.path] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([path, views]) => ({ path, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
    }, [pageViews]);
    
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

    return (
        <div className="container mx-auto py-10">
            <PageHeader
                title="Visitor Analytics"
                description="Review and analyze your website's traffic."
            />
            <div className="mt-8 grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Most Visited Pages ({datePreset.charAt(0).toUpperCase() + datePreset.slice(1)})</CardTitle>
                        <CardDescription>A look at the most popular pages on your site for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <p>Loading chart data...</p> : (
                            <ChartContainer config={{}} className="h-96 w-full">
                                <ResponsiveContainer>
                                    <BarChart data={chartData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="path" type="category" width={150} tick={{ fontSize: 12 }} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Page View Log</CardTitle>
                            <CardDescription>A detailed log of the 100 most recent page views for the selected period.</CardDescription>
                        </div>
                        <Select value={datePreset} onValueChange={handleDatePresetChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by date" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="day">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p>Loading page views...</p>
                        ) : (
                            <DataTable columns={getColumns()} data={pageViews || []} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


export default function VisitorAnalyticsPage() {
    return (
        <Suspense fallback={<VisitorAnalyticsPageSkeleton />}>
            <VisitorAnalyticsPageContent />
        </Suspense>
    );
}