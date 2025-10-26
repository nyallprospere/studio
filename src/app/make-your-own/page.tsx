

'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { Constituency, ElectionResult, Election, SiteSettings, UserMap, Party } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase, useUser, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy, where, getDocs, addDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { Share2, Twitter, Facebook, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Copy } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toPng } from 'html-to-image';
import Image from 'next/image';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { v4 as uuidv4 } from 'uuid';


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

const getVictoryStatus = (slpSeats: number, uwpSeats: number, indSeats: number) => {
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
    
    return { status, color };
};


const VictoryStatusBar = ({ slpSeats, uwpSeats, indSeats }: { slpSeats: number, uwpSeats: number, indSeats: number }) => {
  const { status, color } = getVictoryStatus(slpSeats, uwpSeats, indSeats);

  return (
    <div className={`p-2 rounded-md text-center text-white font-bold mb-4 ${color}`}>
        {status}
    </div>
  );
};

// Encoding/Decoding functions
const leaningToChar: { [key: string]: string } = {
    'slp': 's',
    'uwp': 'u',
    'ind': 'i',
    'tossup': 't',
    'unselected': 'x'
};

const charToLeaning: { [key: string]: string } = {
    's': 'slp',
    'u': 'uwp',
    'i': 'ind',
    't': 'tossup',
    'x': 'unselected'
};

const encodeMapData = (constituencies: Constituency[]): string => {
    const orderedConstituencies = [...constituencies].sort((a, b) => a.id.localeCompare(b.id));
    const encodedString = orderedConstituencies.map(c => leaningToChar[c.politicalLeaning || 'unselected']).join('');
    return btoa(encodedString);
};

const decodeMapData = (encodedData: string, initialConstituencies: Constituency[]): Constituency[] => {
    try {
        const decodedString = atob(encodedData);
        const orderedConstituencies = [...initialConstituencies].sort((a, b) => a.id.localeCompare(b.id));
        
        if (decodedString.length !== orderedConstituencies.length) {
            console.error("Decoded data length mismatch");
            return initialConstituencies;
        }

        return orderedConstituencies.map((c, index) => ({
            ...c,
            politicalLeaning: charToLeaning[decodedString[index]] || 'unselected'
        }));
    } catch (e) {
        console.error("Failed to decode map data:", e);
        return initialConstituencies;
    }
};


export default function MakeYourOwnPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { user } = useUser();
    const searchParams = useSearchParams();
    const mapRef = useRef<HTMLDivElement>(null);

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const partiesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'parties') : null), [firestore]);
    const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);

    const layoutRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'pageLayouts') : null, [firestore]);
    const { data: savedLayouts, isLoading: loadingLayout } = useDoc(layoutRef);

    const siteSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
    const { data: siteSettings } = useDoc<SiteSettings>(siteSettingsRef);

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
    const [shareUrl, setShareUrl] = useState('');
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [sharedMapImageUrl, setSharedMapImageUrl] = useState<string | null>(null);
    const [dynamicShareTitle, setDynamicShareTitle] = useState('');
    const [dynamicShareDescription, setDynamicShareDescription] = useState('');


    useEffect(() => {
        if(constituencies) {
            const mapData = searchParams.get('map');
            if (mapData) {
                const decodedConstituencies = decodeMapData(mapData, constituencies);
                setMyMapConstituencies(decodedConstituencies);
            } else {
                 setMyMapConstituencies(constituencies.map(c => ({...c, politicalLeaning: 'unselected'})))
            }
        }
    }, [constituencies, searchParams])

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

    const handleSelectAll = (party: 'slp' | 'uwp' | 'unselected') => {
        setMyMapConstituencies(prev =>
            prev.map(c => ({ ...c, politicalLeaning: party }))
        );
    };
    
   const handleSaveAndShare = async () => {
    if (!mapRef.current || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'An unexpected error occurred. Please try again.',
        });
        return;
    }

    setIsSaving(true);
    try {
        const dataUrl = await toPng(mapRef.current);
        const mapData = myMapConstituencies.map(c => ({
            constituencyId: c.id,
            politicalLeaning: c.politicalLeaning || 'unselected',
        }));

        const storage = getStorage();
        const imageId = uuidv4();
        const imagePath = `SavedMaps/${imageId}.png`;
        const imageRef = storageRef(storage, imagePath);
        
        await uploadString(imageRef, dataUrl, 'data_url');
        const imageUrl = await getDownloadURL(imageRef);

        const mapsCollection = collection(firestore, 'user_maps');
        
        const docRef = await addDoc(mapsCollection, {
            mapData: mapData,
            createdAt: serverTimestamp(),
            imageUrl: imageUrl,
        }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'user_maps',
                operation: 'create',
                requestResourceData: {mapData}
            }))
            // Propagate a generic error message to the user
            throw new Error("Could not save your map. Please try again.");
        })

        if (docRef) {
            const url = `${window.location.origin}/maps/${docRef.id}`;
            setShareUrl(url);
            setSharedMapImageUrl(imageUrl);

            const { slp, uwp, ind } = seatCounts;
            const title = `I predict SLP ${slp}, UWP ${uwp}, and IND ${ind} for the Election.`;
            setDynamicShareTitle(title);
            
            const victoryStatus = getVictoryStatus(slp, uwp, ind).status;
            const description = `${victoryStatus} Make your own prediction:`;
            setDynamicShareDescription(description);
            
            setIsShareDialogOpen(true);
        }

    } catch (error: any) {
        console.error('Save and share error:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Could not save your map. Please try again.',
        });
    } finally {
        setIsSaving(false);
    }
};


    const isLoading = loadingConstituencies || loadingLayout || loadingElections || loadingParties;

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

    const shareDescription = siteSettings?.defaultShareDescription || "I made my own prediction for the 2026 St. Lucian General Election. See what you think!";
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(dynamicShareTitle)}&url=${encodeURIComponent(shareUrl)}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    
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

    const slpColor = parties?.find(p => p.acronym === 'SLP')?.color || 'hsl(var(--chart-5))';
    const uwpColor = parties?.find(p => p.acronym === 'UWP')?.color || 'hsl(var(--chart-1))';

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
                <CardContent className="p-2" ref={mapRef}>
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
                        {user && (
                            <div className="mt-4 flex w-full justify-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSelectAll('slp')}>Select All SLP</Button>
                                <Button variant="outline" size="sm" onClick={() => handleSelectAll('uwp')}>Select All UWP</Button>
                                <Button variant="outline" size="sm" onClick={() => handleSelectAll('unselected')}>Clear All</Button>
                            </div>
                        )}
                        <div className="mt-6 w-full space-y-4">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="w-full">
                                            <Button onClick={handleSaveAndShare} disabled={!allSelected || isSaving} className="w-full">
                                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                                                Save & Share
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                     {!allSelected && (
                                        <TooltipContent>
                                            <p>Please make a selection for all constituencies to share your map.</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>
                        I predict{' '}
                        <span style={{ color: slpColor }} className="font-bold">SLP {seatCounts.slp}</span>,{' '}
                        <span style={{ color: uwpColor }} className="font-bold">UWP {seatCounts.uwp}</span>, and{' '}
                        <span style={{ color: 'hsl(var(--primary))' }} className="font-bold">IND {seatCounts.ind}</span> for the Election.
                  </DialogTitle>
                  <DialogDescription>
                        {dynamicShareDescription}{' '}
                        <a href={shareUrl} className="text-primary underline">Make your own prediction</a>
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                  {sharedMapImageUrl && (
                      <div className="relative h-64 w-full rounded-lg overflow-hidden border">
                          <Image src={sharedMapImageUrl} alt="User prediction map" fill className="object-contain" />
                      </div>
                  )}
                    <div className="flex items-center space-x-2">
                        <Input value={shareUrl} readOnly className="break-all" />
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






