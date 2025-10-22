

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase, useUser, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { debounce } from 'lodash';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';

const politicalLeaningOptions = [
  { value: 'solid-slp', label: 'Solid SLP', color: 'hsl(var(--chart-5))' },
  { value: 'lean-slp', label: 'Lean SLP', color: 'hsl(var(--chart-3))' },
  { value: 'tossup', label: 'Tossup', color: 'hsl(var(--chart-4))' },
  { value: 'lean-uwp', label: 'Lean UWP', color: 'hsl(var(--chart-2))' },
  { value: 'solid-uwp', label: 'Solid UWP', color: 'hsl(var(--chart-1))' },
];

const makeYourOwnLeaningOptions = [
  { value: 'slp', label: 'SLP', color: 'fill-red-500' },
  { value: 'uwp', label: 'UWP', color: 'fill-yellow-400' },
  { value: 'tossup', label: 'Toss Up', color: 'fill-purple-500' },
  { value: 'unselected', label: 'To be selected', color: 'fill-gray-300' },
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

const DEFAULT_LAYOUT = {
    pageTitle: 'Constituencies',
    pageDescription: 'Explore the 17 electoral districts of St. Lucia.',
    seatCountTitle: 'Seat Count',
    seatCountDescription: 'Current political leaning of the 17 constituencies.',
};

type LayoutConfiguration = typeof DEFAULT_LAYOUT;

export default function MakeYourOwnPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const layoutRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'pageLayouts') : null, [firestore]);
    const { data: savedLayouts, isLoading: loadingLayout } = useDoc(layoutRef);

    const [pageTitle, setPageTitle] = useState(DEFAULT_LAYOUT.pageTitle);
    const [pageDescription, setPageDescription] = useState(DEFAULT_LAYOUT.pageDescription);
    const [seatCountTitle, setSeatCountTitle] = useState(DEFAULT_LAYOUT.seatCountTitle);
    const [seatCountDescription, setSeatCountDescription] = useState(DEFAULT_LAYOUT.seatCountDescription);
    
    const [isEditingPageTitle, setIsEditingPageTitle] = useState(false);
    const [isEditingPageDescription, setIsEditingPageDescription] = useState(false);
    const [isEditingSeatCountTitle, setIsEditingSeatCountTitle] = useState(false);
    const [isEditingSeatCountDescription, setIsEditingSeatCountDescription] = useState(false);
    
    const [myMapConstituencies, setMyMapConstituencies] = useState<Constituency[]>([]);
    const [selectedMyMapConstituencyId, setSelectedMyMapConstituencyId] = useState<string | null>(null);

    useEffect(() => {
        if(constituencies) {
            setMyMapConstituencies(constituencies.map(c => ({...c, politicalLeaning: 'unselected'})))
        }
    }, [constituencies])


    const debouncedSaveLayout = useCallback(
        debounce((layout: Partial<LayoutConfiguration>) => {
            if (firestore && user) {
                const docRef = doc(firestore, 'settings', 'pageLayouts');
                const layoutData = { constituenciesPage: layout };
                setDoc(docRef, layoutData, { merge: true })
                  .catch((error) => {
                    const contextualError = new FirestorePermissionError({
                      path: docRef.path,
                      operation: 'update',
                      requestResourceData: layoutData,
                    });
                    errorEmitter.emit('permission-error', contextualError);
                  });
            }
        }, 1000), [firestore, user]
    );

    useEffect(() => {
        if (!user) return; // Only save layout if a user is logged in.
        const layoutState = { pageTitle, pageDescription, seatCountTitle, seatCountDescription };
        debouncedSaveLayout(layoutState);
    }, [pageTitle, pageDescription, seatCountTitle, seatCountDescription, debouncedSaveLayout, user]);


    useEffect(() => {
        const savedConstituenciesLayout = savedLayouts?.constituenciesPage as LayoutConfiguration | undefined;
        if (savedConstituenciesLayout) {
            setPageTitle(savedConstituenciesLayout.pageTitle || DEFAULT_LAYOUT.pageTitle);
            setPageDescription(savedConstituenciesLayout.pageDescription || DEFAULT_LAYOUT.pageDescription);
            setSeatCountTitle(savedConstituenciesLayout.seatCountTitle || DEFAULT_LAYOUT.seatCountTitle);
            setSeatCountDescription(savedConstituenciesLayout.seatCountDescription || DEFAULT_LAYOUT.seatCountDescription);
        }
    }, [savedLayouts]);
    
    const handleMyMapLeaningChange = useCallback((id: string, newLeaning: string) => {
        setMyMapConstituencies(prev =>
            prev.map(c =>
                c.id === id ? { ...c, politicalLeaning: newLeaning as any } : c
            )
        );
    }, []);

    const isLoading = loadingConstituencies || loadingLayout;

    const myMapChartData = useMemo(() => {
        if (!myMapConstituencies) return [];

        const counts = myMapConstituencies.reduce((acc, constituency) => {
            const leaning = constituency.politicalLeaning || 'unselected';
            acc[leaning] = (acc[leaning] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return makeYourOwnLeaningOptions.map(opt => ({
            name: opt.label,
            value: counts[opt.value] || 0,
            fill: opt.value === 'slp' ? 'hsl(var(--chart-5))' : opt.value === 'uwp' ? 'hsl(var(--chart-1))' : opt.value === 'tossup' ? 'hsl(var(--chart-4))' : '#d1d5db',
        })).filter(item => item.value > 0);
    }, [myMapConstituencies]);

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
        <div className="mb-8">
            <div onClick={() => user && setIsEditingPageTitle(true)}>
                {isEditingPageTitle && user ? (
                     <div className="flex items-center gap-2 max-w-lg">
                        <Input value={pageTitle} onChange={e => setPageTitle(e.target.value)} className="text-3xl md:text-4xl font-bold tracking-tight font-headline" />
                        <Button onClick={(e) => {e.stopPropagation(); setIsEditingPageTitle(false);}}>Save</Button>
                    </div>
                ) : (
                    <h1 className="text-3xl font-bold tracking-tight font-headline text-primary md:text-4xl">
                        {pageTitle}
                    </h1>
                )}
            </div>
             <div onClick={() => user && setIsEditingPageDescription(true)}>
                {isEditingPageDescription && user ? (
                    <div className="flex items-center gap-2 max-w-lg mt-2">
                        <Input value={pageDescription} onChange={e => setPageDescription(e.target.value)} className="text-lg" />
                        <Button onClick={(e) => {e.stopPropagation(); setIsEditingPageDescription(false);}}>Save</Button>
                    </div>
                ) : (
                    <p className="mt-2 text-lg text-muted-foreground">{pageDescription}</p>
                )}
            </div>
        </div>

      {isLoading || !constituencies ? (
          <ConstituenciesPageSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <InteractiveSvgMap 
                constituencies={myMapConstituencies} 
                selectedConstituencyId={selectedMyMapConstituencyId}
                onConstituencyClick={setSelectedMyMapConstituencyId}
                onLeaningChange={handleMyMapLeaningChange}
                isMakeYourOwn={true}
            />
          </div>
            <div>
                <Card>
                    <CardHeader>
                        {isEditingSeatCountTitle && user ? (
                            <div className="flex items-center gap-2">
                                <Input value={seatCountTitle} onChange={(e) => setSeatCountTitle(e.target.value)} className="font-headline" />
                                <Button size="sm" onClick={() => setIsEditingSeatCountTitle(false)}>Save</Button>
                            </div>
                        ) : (
                            <CardTitle className="font-headline" onClick={() => user && setIsEditingSeatCountTitle(true)}>
                                {seatCountTitle}
                            </CardTitle>
                        )}
                        {isEditingSeatCountDescription && user ? (
                            <div className="flex items-center gap-2">
                            <Input value={seatCountDescription} onChange={(e) => setSeatCountDescription(e.target.value)} />
                            <Button size="sm" onClick={() => setIsEditingSeatCountDescription(false)}>Save</Button>
                            </div>
                        ) : (
                            <CardDescription onClick={() => user && setIsEditingSeatCountDescription(true)}>{seatCountDescription}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <ChartContainer config={chartConfig} className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <ChartTooltip 
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Pie 
                                        data={myMapChartData} 
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%" 
                                        cy="100%" 
                                        startAngle={180} 
                                        endAngle={0} 
                                        innerRadius="60%"
                                        outerRadius="100%"
                                        paddingAngle={2}
                                    >
                                        {myMapChartData.map((entry) => (
                                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
                            {myMapChartData.map((option) => {
                                if (option.value === 0) return null;
                                return (
                                    <div key={option.name} className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: option.fill }}></span>
                                        <span>{option.name}</span>
                                        <span className="font-bold">({option.value})</span>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}

