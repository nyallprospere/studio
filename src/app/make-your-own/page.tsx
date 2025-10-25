

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Constituency, UserMap, ElectionResult, Election } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase, useUser, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, addDoc, serverTimestamp, query, orderBy, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { debounce } from 'lodash';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { Save, Share2, Twitter, Facebook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Copy } from 'lucide-react';
import { saveUserMap } from '@/lib/actions';


const politicalLeaningOptions = [
  { value: 'solid-slp', label: 'Solid SLP', color: 'hsl(var(--chart-5))' },
  { value: 'lean-slp', label: 'Lean SLP', color: 'hsl(var(--chart-3))' },
  { value: 'tossup', label: 'Tossup', color: 'hsl(var(--chart-4))' },
  { value: 'lean-uwp', label: 'Lean UWP', color: 'hsl(var(--chart-2))' },
  { value: 'solid-uwp', label: 'Solid UWP', color: 'hsl(var(--chart-1))' },
];

const makeYourOwnLeaningOptions = [
  { value: 'slp', label: 'SLP' },
  { value: 'uwp', label: 'UWP' },
  { value: 'ind', label: 'IND' },
  { value: 'tossup', label: 'Toss Up' },
  { value: 'unselected', label: 'To be selected' },
];


function ConstituenciesPageSkeleton() {
    return (
      <div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2 mt-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="md:col-span-1">
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
    pageTitle: 'Make Your Own Map',
    pageDescription: 'Create and share your 2026 election prediction.',
    seatCountTitle: 'Your Prediction',
    seatCountDescription: 'Assign a winner to each constituency.',
};

type LayoutConfiguration = typeof DEFAULT_LAYOUT;

const VictoryStatusBar = ({ slpSeats, uwpSeats, indSeats }: { slpSeats: number, uwpSeats: number, indSeats: number }) => {
  const getStatus = (seats: number) => {
    if (seats >= 16) return 'SLP Wins a Landslide!';
    if (seats >= 14) return 'SLP Wins a Decisive Victory';
    if (seats >= 11) return 'SLP Wins The Election.';
    if (seats >= 9) return 'SLP Wins Close Victory';
    return null;
  };
  
  const getUWPStatus = (seats: number) => {
    if (seats >= 16) return 'UWP Wins a Landslide!';
    if (seats >= 14) return 'UWP Wins a Decisive Victory';
    if (seats >= 11) return 'UWP Wins The Election.';
    if (seats >= 9) return 'UWP Wins Close Victory';
    return null;
  }

  const slpStatus = getStatus(slpSeats);
  const uwpStatus = getUWPStatus(uwpSeats);

  let status = 'Too Early To Tell';
  let color = 'bg-purple-500';

  if (slpStatus) {
    status = slpStatus;
    color = 'bg-red-500';
  } else if (uwpStatus) {
    status = uwpStatus;
    color = 'bg-yellow-400 text-black';
  } else if (slpSeats + indSeats >= 9) {
    status = 'SLP Wins Very Close Victory';
    color = 'bg-red-500';
  }


  return (
    <div className={`p-2 rounded-md text-center text-white font-bold mb-4 ${color}`}>
        {status}
    </div>
  );
};

export default function MakeYourOwnPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const layoutRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'pageLayouts') : null, [firestore]);
    const { data: savedLayouts, isLoading: loadingLayout } = useDoc(layoutRef);

    const siteSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
    const { data: siteSettings } = useDoc(siteSettingsRef);

    const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), orderBy('year', 'desc')) : null, [firestore]);
    const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
    
    const [previousElectionResults, setPreviousElectionResults] = useState<ElectionResult[]>([]);

    useEffect(() => {
        if (!firestore || !elections || elections.length < 2) return;
        
        const previousElection = elections.find(e => e.year === 2021);
        if (!previousElection) return;
        
        const resultsRef = collection(firestore, 'election_results');
        const q = query(resultsRef, where('electionId', '==', previousElection.id));
        
        getDocs(q).then(snapshot => {
            const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ElectionResult));
            setPreviousElectionResults(results);
        });

    }, [firestore, elections]);
    

    const [pageTitle, setPageTitle] = useState(DEFAULT_LAYOUT.pageTitle);
    const [pageDescription, setPageDescription] = useState(DEFAULT_LAYOUT.pageDescription);
    const [seatCountTitle, setSeatCountTitle] = useState(DEFAULT_LAYOUT.seatCountTitle);
    const [seatCountDescription, setSeatCountDescription] = useState(DEFAULT_LAYOUT.seatCountDescription);
    
    const [myMapConstituencies, setMyMapConstituencies] = useState<Constituency[]>([]);
    const [selectedMyMapConstituencyId, setSelectedMyMapConstituencyId] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [savedMapId, setSavedMapId] = useState<string | null>(null);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);


    useEffect(() => {
        if(constituencies) {
            setMyMapConstituencies(constituencies.map(c => ({...c, politicalLeaning: 'unselected'})))
        }
    }, [constituencies])

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
    
    const handleSaveAndShare = async () => {
        setIsSaving(true);
        try {
            const mapData = myMapConstituencies.map(c => ({
                constituencyId: c.id,
                politicalLeaning: c.politicalLeaning || 'unselected'
            }));

            const result = await saveUserMap(mapData);

            if(result.error) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
                return;
            }

            if(result.id) {
                setSavedMapId(result.id);
                setIsShareDialogOpen(true);
                toast({ title: 'Map Saved!', description: 'Your prediction map has been saved and is ready to share.' });
            }
        } catch (e) {
            console.error('Error saving map:', e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your map. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    }

    const isLoading = loadingConstituencies || loadingLayout || loadingElections;

    const { myMapChartData, seatCounts, allSelected, seatChanges } = useMemo(() => {
        if (!myMapConstituencies) return { myMapChartData: [], seatCounts: {}, allSelected: false, seatChanges: {} };
    
        let slpCount = 0;
        let uwpCount = 0;
        let indCount = 0;
        let unselectedCount = 0;
    
        myMapConstituencies.forEach(c => {
            const leaning = c.politicalLeaning || 'unselected';
            
            if (leaning === 'slp') {
                slpCount++;
            } else if (leaning === 'uwp') {
                uwpCount++;
            } else if (leaning === 'ind') {
                indCount++;
            } else if (leaning === 'unselected') {
                unselectedCount++;
            }
        });
    
        const seatCounts = {
            slp: slpCount,
            uwp: uwpCount,
            ind: indCount,
            unselected: unselectedCount
        };
    
        const allSelected = seatCounts.unselected === 0;
    
        const chartData = makeYourOwnLeaningOptions
        .filter(opt => opt.value !== 'tossup')
        .map(opt => {
            let value = 0;
            if (opt.value === 'slp') value = slpCount;
            else if (opt.value === 'uwp') value = uwpCount;
            else if (opt.value === 'ind') value = indCount;
            else if (opt.value === 'unselected') value = unselectedCount;
            
            return {
                name: opt.label,
                value: value,
                fill: opt.value === 'slp' ? 'hsl(var(--chart-5))' : opt.value === 'uwp' ? 'hsl(var(--chart-1))' : opt.value === 'ind' ? 'hsl(var(--primary))' : '#d1d5db',
            };
        });

        let seatChanges = { slp: null, uwp: null };
        if (allSelected && previousElectionResults.length > 0) {
            const prevSlpSeats = previousElectionResults.filter(r => r.slpVotes > r.uwpVotes).length;
            const prevUwpSeats = previousElectionResults.filter(r => r.uwpVotes > r.slpVotes).length;
            seatChanges = {
                slp: seatCounts.slp - prevSlpSeats,
                uwp: seatCounts.uwp - prevUwpSeats,
            }
        }

        return { myMapChartData: chartData, seatCounts, allSelected, seatChanges };
    }, [myMapConstituencies, previousElectionResults]);


    const chartConfig = politicalLeaningOptions.reduce((acc, option) => {
        // @ts-ignore
        acc[option.label] = {
            label: option.label,
            color: option.color,
        };
        return acc;
    }, {});

    const shareUrl = savedMapId ? `${window.location.origin}/maps/${savedMapId}` : '';
    const shareTitle = siteSettings?.defaultShareTitle || "Check out my St. Lucia election prediction!";
    const shareDescription = siteSettings?.defaultShareDescription || "I made my own 2026 election prediction on LucianVotes. See my map and create your own!";
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareDescription)}`;
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link Copied!', description: 'The shareable link has been copied to your clipboard.' });
    };

    const SeatChangeIndicator = ({ change }: { change: number | null }) => {
        if (change === null) return null;
        const color = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground';
        const sign = change > 0 ? '+' : '';
        return <span className={`text-xs font-semibold ml-1 ${color}`}>({sign}{change})</span>;
    };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight font-headline text-primary md:text-4xl">
                {pageTitle}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">{pageDescription}</p>
        </div>

      {isLoading || !constituencies ? (
          <ConstituenciesPageSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-1">
             <Card>
                <CardContent className="p-2">
                    <InteractiveSvgMap 
                        constituencies={myMapConstituencies} 
                        selectedConstituencyId={selectedMyMapConstituencyId}
                        onConstituencyClick={setSelectedMyMapConstituencyId}
                        onLeaningChange={handleMyMapLeaningChange}
                        isMakeYourOwn={true}
                    />
                </CardContent>
            </Card>
          </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">{seatCountTitle}</CardTitle>
                        <CardDescription>{seatCountDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <VictoryStatusBar slpSeats={seatCounts.slp} uwpSeats={seatCounts.uwp} indSeats={seatCounts.ind} />
                        <div className="grid grid-cols-3 gap-4 w-full text-center mb-4">
                            <div>
                                <p className="font-bold text-lg" style={{color: 'hsl(var(--chart-5))'}}>{seatCounts.slp}</p>
                                <p className="text-muted-foreground font-semibold text-sm">SLP Seats {allSelected && <SeatChangeIndicator change={seatChanges.slp} />}</p>
                            </div>
                            <div>
                                <p className="font-bold text-lg" style={{color: 'hsl(var(--chart-1))'}}>{seatCounts.uwp}</p>
                                <p className="text-muted-foreground font-semibold text-sm">UWP Seats {allSelected && <SeatChangeIndicator change={seatChanges.uwp} />}</p>
                            </div>
                             <div>
                                <p className="font-bold text-lg" style={{color: 'hsl(var(--primary))'}}>{seatCounts.ind}</p>
                                <p className="text-muted-foreground font-semibold text-sm">IND Seats</p>
                            </div>
                        </div>
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
                                if (option.value === 0 || option.name !== 'To be selected') return null;
                                return (
                                    <div key={option.name} className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: option.fill }}></span>
                                        <span>{option.name}</span>
                                        <span className="font-bold">({option.value})</span>
                                    </div>
                                )
                            })}
                        </div>
                        <Button onClick={handleSaveAndShare} disabled={isSaving || !allSelected} className="w-full mt-6">
                            <Share2 className="mr-2 h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save & Share'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Share Your Prediction Map</DialogTitle>
                  <DialogDescription>
                      Your custom map has been saved. Share it with your friends!
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Input value={shareUrl} readOnly />
                        <Button type="button" size="icon" onClick={copyToClipboard}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                  <div className="flex justify-center gap-4">
                      <Button asChild>
                          <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer">
                            <Twitter className="mr-2 h-4 w-4" /> Share on Twitter
                          </a>
                      </Button>
                       <Button asChild>
                          <a href={facebookShareUrl} target="_blank" rel="noopener noreferrer">
                            <Facebook className="mr-2 h-4 w-4" /> Share on Facebook
                          </a>
                      </Button>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}









