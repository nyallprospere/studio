
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { InteractiveMap } from '@/components/interactive-map';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';


const politicalLeaningOptions = [
  { value: 'solid-slp', label: 'Solid SLP', color: 'hsl(var(--chart-5))' },
  { value: 'lean-slp', label: 'Lean SLP', color: 'hsl(var(--chart-3))' },
  { value: 'tossup', label: 'Tossup', color: 'hsl(var(--chart-4))' },
  { value: 'lean-uwp', label: 'Lean UWP', color: 'hsl(var(--chart-2))' },
  { value: 'solid-uwp', label: 'Solid UWP', color: 'hsl(var(--chart-1))' },
];


function ConstituenciesPageSkeleton() {
    return (
      <div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2 mt-2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="md:col-span-2">
                <Skeleton className="h-[70vh] w-full" />
            </div>
            <div>
                <Card>
                    <CardHeader><Skeleton className="h-8 w-2/3" /></CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    );
}

export default function ConstituenciesPage() {
    const { firestore } = useFirebase();

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const isLoading = loadingConstituencies;

    const chartData = useMemo(() => {
        if (!constituencies) return [];

        const counts = constituencies.reduce((acc, constituency) => {
            const leaning = constituency.politicalLeaning || 'tossup';
            acc[leaning] = (acc[leaning] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const data = { name: 'Seats' };
        politicalLeaningOptions.forEach(opt => {
            // @ts-ignore
            data[opt.label] = counts[opt.value] || 0;
        });
        
        return [data];
    }, [constituencies]);

    const chartConfig = politicalLeaningOptions.reduce((acc, option) => {
        // @ts-ignore
        acc[option.label] = {
            label: option.label,
            color: option.color,
        };
        return acc;
    }, {});


  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Constituencies"
        description="Explore the 17 electoral districts of St. Lucia."
      />
      {isLoading || !constituencies ? (
          <ConstituenciesPageSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <CardContent className="p-2">
                         <InteractiveMap constituencies={constituencies} />
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="font-headline">Seat Count</CardTitle>
                    <CardDescription>Current political leaning of the 17 constituencies.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <ChartContainer config={chartConfig} className="h-24 w-full">
                        <ResponsiveContainer width="100%" height={50}>
                            <BarChart
                                layout="vertical"
                                data={chartData}
                                stackOffset="expand"
                                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                                >
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" hide />
                                <ChartTooltip 
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                {politicalLeaningOptions.map((option) => (
                                    <Bar 
                                        key={option.value} 
                                        dataKey={option.label} 
                                        fill={option.color} 
                                        stackId="a" 
                                        radius={[4, 4, 4, 4]} 
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                     <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
                        {politicalLeaningOptions.map((option) => (
                            <div key={option.value} className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }}></span>
                                <span>{option.label}</span>
                                <span className="font-bold">({chartData[0]?.[option.label] || 0})</span>
                            </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}
