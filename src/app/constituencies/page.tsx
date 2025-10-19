

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase, useUser, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { debounce, isEqual } from 'lodash';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { Save, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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

const DEFAULT_LAYOUT = {
    pageTitle: 'Constituencies',
    pageDescription: 'Explore the 17 electoral districts of St. Lucia.',
    seatCountTitle: 'Seat Count',
    seatCountDescription: 'Current political leaning of the 17 constituencies.',
};

type LayoutConfiguration = typeof DEFAULT_LAYOUT;

export default function ConstituenciesPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();

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
    const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);

    const [editableConstituencies, setEditableConstituencies] = useState<Constituency[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const hasUnsavedChanges = useMemo(() => {
        if (!constituencies || !editableConstituencies) return false;
        // Sort both arrays by ID to ensure correct comparison
        const sortedOriginal = [...constituencies].sort((a, b) => a.id.localeCompare(b.id));
        const sortedEditable = [...editableConstituencies].sort((a, b) => a.id.localeCompare(b.id));
        return !isEqual(sortedOriginal, sortedEditable);
    }, [constituencies, editableConstituencies]);

    
    useEffect(() => {
        if(constituencies) {
            setEditableConstituencies(JSON.parse(JSON.stringify(constituencies)));
        }
    }, [constituencies]);


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
    
    const handleLeaningChange = useCallback((id: string, newLeaning: string) => {
        setEditableConstituencies(prev =>
            prev.map(c =>
                c.id === id ? { ...c, politicalLeaning: newLeaning as Constituency['politicalLeaning'] } : c
            )
        );
    }, []);

    const handlePredictionChange = useCallback((id: string, slp: number, uwp: number) => {
        setEditableConstituencies(prev =>
            prev.map(c =>
                c.id === id ? { ...c, predictedSlpPercentage: slp, predictedUwpPercentage: uwp } : c
            )
        );
    }, []);

    const handleSaveAll = async () => {
        if (!firestore || !user) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            editableConstituencies.forEach(c => {
                const { id, ...dataToSave } = c;
                const docRef = doc(firestore, 'constituencies', id);
                batch.update(docRef, dataToSave as any);
            });
            await batch.commit();
            toast({ title: 'Success', description: 'Your changes have been saved.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save changes.' });
        } finally {
            setIsSaving(false);
        }
    }


    const isLoading = loadingConstituencies || loadingLayout;

    const chartData = useMemo(() => {
        if (!editableConstituencies) return [];

        const counts = editableConstituencies.reduce((acc, constituency) => {
            const leaning = constituency.politicalLeaning || 'tossup';
            acc[leaning] = (acc[leaning] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return politicalLeaningOptions.map(opt => ({
            name: opt.label,
            value: counts[opt.value] || 0,
            fill: opt.color,
        })).filter(item => item.value > 0);
    }, [editableConstituencies]);

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
        <div className="flex justify-between items-start mb-8">
            <div>
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
            {user && (
                <Button onClick={handleSaveAll} disabled={isSaving || !hasUnsavedChanges}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            )}
        </div>

      {isLoading || !editableConstituencies ? (
          <ConstituenciesPageSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <InteractiveSvgMap 
                constituencies={editableConstituencies} 
                selectedConstituencyId={selectedConstituencyId}
                onConstituencyClick={setSelectedConstituencyId}
                onLeaningChange={user ? handleLeaningChange : undefined}
                onPredictionChange={user ? handlePredictionChange : undefined}
            />
          </div>
          <div>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <div>
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
                        </div>
                        {user && (
                            <Button asChild variant="outline" size="icon">
                                <Link href="/admin/constituencies">
                                    <Pencil className="h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </div>
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
                                    data={chartData} 
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
                                     {chartData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                    ))}
                                    <Label
                                        content={({ viewBox }) => {
                                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                return (
                                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                        <tspan x={viewBox.cx} dy="-0.5em" className="text-3xl font-bold">{constituencies.length}</tspan>
                                                        <tspan x={viewBox.cx} dy="1.2em" className="text-sm text-muted-foreground">Seats</tspan>
                                                    </text>
                                                )
                                            }
                                        }}
                                    />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
                        {politicalLeaningOptions.map((option) => {
                            const count = chartData.find(d => d.name === option.label)?.value || 0;
                            if (count === 0) return null;
                            return (
                                <div key={option.value} className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }}></span>
                                    <span>{option.label}</span>
                                    <span className="font-bold">({count})</span>
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
