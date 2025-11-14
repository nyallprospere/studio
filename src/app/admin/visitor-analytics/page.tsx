'use client';

import { PageHeader } from '@/components/page-header';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import type { PageView } from '@/lib/types';
import { useState } from 'react';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { startOfDay, endOfDay } from 'date-fns';

export default function VisitorAnalyticsPage() {
    const { firestore } = useFirebase();
    const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('day');

    const todayStart = startOfDay(new Date());

    const pageViewsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'page_views'), where('timestamp', '>=', todayStart), orderBy('timestamp', 'desc'));
    }, [firestore, todayStart]);
    
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
    
    return (
        <div className="container mx-auto py-10">
            <PageHeader
                title="Visitor Analytics"
                description="Review and analyze your website's traffic."
            />
            <div className="mt-8 grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Most Visited Pages (Today)</CardTitle>
                        <CardDescription>A look at the most popular pages on your site today.</CardDescription>
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
                    <CardHeader>
                        <CardTitle>Page View Log</CardTitle>
                        <CardDescription>A detailed log of every page view recorded.</CardDescription>
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
