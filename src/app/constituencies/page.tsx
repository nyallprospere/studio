

'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collection }from 'firebase/firestore';
import { InteractiveMap } from '@/components/interactive-map';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';


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

type SectionId = 'map' | 'seatCount';
type SectionLayout = {
    [key in SectionId]: { span: number };
}

function SortableSection({ id, children, onResize }: { id: SectionId, children: React.ReactNode, onResize: (id: SectionId, direction: 'expand' | 'compress') => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const { user } = useUser();
  
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
  
    if (!user) return <>{children}</>;
  
    return (
      <div ref={setNodeRef} style={style} className="relative group/section">
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-1">
            <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => onResize(id, 'compress')}><Minus className="h-4 w-4" /></Button>
            <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => onResize(id, 'expand')}><Plus className="h-4 w-4" /></Button>
            <div {...attributes} {...listeners} className="cursor-grab rounded-md bg-primary/20 p-2 text-primary-foreground backdrop-blur-sm">
                <GripVertical className="h-5 w-5 text-primary" />
            </div>
        </div>
        {children}
      </div>
    );
}

export default function ConstituenciesPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const [pageTitle, setPageTitle] = useState('Constituencies');
    const [pageDescription, setPageDescription] = useState('Explore the 17 electoral districts of St. Lucia.');
    const [seatCountTitle, setSeatCountTitle] = useState('Seat Count');
    const [seatCountDescription, setSeatCountDescription] = useState('Current political leaning of the 17 constituencies.');
    
    const [isEditingPageTitle, setIsEditingPageTitle] = useState(false);
    const [isEditingPageDescription, setIsEditingPageDescription] = useState(false);
    const [isEditingSeatCountTitle, setIsEditingSeatCountTitle] = useState(false);
    const [isEditingSeatCountDescription, setIsEditingSeatCountDescription] = useState(false);

    const [sections, setSections] = useState<SectionId[]>(['map', 'seatCount']);
    const [sectionLayout, setSectionLayout] = useState<SectionLayout>({
        map: { span: 2 },
        seatCount: { span: 1 },
    });

    const sensors = useSensors(useSensor(PointerSensor));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSections((items) => {
                const oldIndex = items.indexOf(active.id as SectionId);
                const newIndex = items.indexOf(over.id as SectionId);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleResize = (id: SectionId, direction: 'expand' | 'compress') => {
        setSectionLayout(prevLayout => {
            const newLayout = { ...prevLayout };
            const currentSpan = newLayout[id].span;
            const otherId = id === 'map' ? 'seatCount' : 'map';
            const otherSpan = newLayout[otherId].span;
            
            if (direction === 'expand' && currentSpan < 3 && (currentSpan + otherSpan < 3)) {
                newLayout[id].span = currentSpan + 1;
            } else if (direction === 'compress' && currentSpan > 1) {
                newLayout[id].span = currentSpan - 1;
            }

            return newLayout;
        });
    };

    const isLoading = loadingConstituencies;

    const chartData = useMemo(() => {
        if (!constituencies) return [];

        const counts = constituencies.reduce((acc, constituency) => {
            const leaning = constituency.politicalLeaning || 'tossup';
            acc[leaning] = (acc[leaning] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return politicalLeaningOptions.map(opt => ({
            name: opt.label,
            value: counts[opt.value] || 0,
            fill: opt.color,
        })).filter(item => item.value > 0);
    }, [constituencies]);

    const chartConfig = politicalLeaningOptions.reduce((acc, option) => {
        // @ts-ignore
        acc[option.label] = {
            label: option.label,
            color: option.color,
        };
        return acc;
    }, {});


    const pageContent = {
        map: (
            <div className={cn("w-full", `md:col-span-${sectionLayout.map.span}`)}>
                <Card>
                    <CardContent className="p-2">
                         <InteractiveMap constituencies={constituencies ?? []} />
                    </CardContent>
                </Card>
            </div>
        ),
        seatCount: (
             <div className={cn("w-full", `md:col-span-${sectionLayout.seatCount.span}`)}>
                <Card className="sticky top-24">
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
                     <ChartContainer config={chartConfig} className="h-64 w-full">
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
                                    cy="50%" 
                                    startAngle={180} 
                                    endAngle={0} 
                                    innerRadius="60%"
                                    outerRadius="100%"
                                    paddingAngle={2}
                                >
                                     {chartData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                    ))}
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
        )
    };

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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={sections} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {sections.map(sectionId => {
                        const sectionContent = pageContent[sectionId];
                        return sectionContent ? (
                            <SortableSection key={sectionId} id={sectionId} onResize={handleResize}>
                                {sectionContent}
                            </SortableSection>
                        ) : null;
                    })}
                </div>
            </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
