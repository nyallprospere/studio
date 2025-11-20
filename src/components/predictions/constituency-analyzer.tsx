
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyzeConstituencyOutcome, type AnalyzeConstituencyOutcomeOutput } from '@/lib/actions';
import { Loader2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Constituency, Election, Candidate, ElectionResult, Party, Region, NewsArticle } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

export function ConstituencyAnalyzer() {
  const { firestore } = useFirebase();
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string>('');
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeConstituencyOutcomeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const electionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'elections') : null, [firestore]);
  const candidatesQuery = useMemoFirebase(() => firestore && selectedConstituencyId ? query(collection(firestore, 'candidates'), where('constituencyId', '==', selectedConstituencyId)) : null, [firestore, selectedConstituencyId]);
  const allResultsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'election_results') : null, [firestore]);
  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const regionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'regions') : null, [firestore]);
  const newsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'news') : null, [firestore]);


  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);
  const { data: allResults, isLoading: loadingResults } = useCollection<ElectionResult>(allResultsQuery);
  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: regions, isLoading: loadingRegions } = useCollection<Region>(regionsQuery);
  const { data: newsArticles, isLoading: loadingNews } = useCollection<NewsArticle>(newsQuery);
  
  const selectedElection = useMemo(() => elections?.find(e => e.id === selectedElectionId), [elections, selectedElectionId]);
  const selectedConstituency = useMemo(() => constituencies?.find(c => c.id === selectedConstituencyId), [constituencies, selectedConstituencyId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConstituencyId || !selectedElectionId || !selectedConstituency || !allResults || !elections) return;

    setIsLoading(true);
    setError(null);
    
    const historicalData = allResults
        ?.filter(r => r.constituencyId === selectedConstituencyId)
        .map(r => {
            const election = elections?.find(e => e.id === r.electionId);
            return election ? { year: election.year, slpVotes: r.slpVotes, uwpVotes: r.uwpVotes, otherVotes: r.otherVotes, totalVotes: r.totalVotes } : null;
        })
        .filter(Boolean);
        
    const nationalSwingData = elections.map(election => {
        const electionResults = allResults.filter(r => r.electionId === election.id);
        const totalVotes = electionResults.reduce((sum, r) => sum + r.totalVotes, 0);
        const slpVotes = electionResults.reduce((sum, r) => sum + r.slpVotes, 0);
        const uwpVotes = electionResults.reduce((sum, r) => sum + r.uwpVotes, 0);
        return {
            year: election.year,
            slpPercentage: totalVotes > 0 ? (slpVotes / totalVotes) * 100 : 0,
            uwpPercentage: totalVotes > 0 ? (uwpVotes / totalVotes) * 100 : 0,
        };
    }).sort((a,b) => a.year - b.year);


    const region = regions?.find(r => r.constituencyIds?.includes(selectedConstituencyId));
    let regionalConstituencyData: any[] = [];
    if (region) {
        const regionalConstituencyIds = region.constituencyIds?.filter(id => id !== selectedConstituencyId);
        regionalConstituencyData = regionalConstituencyIds?.map(constituencyId => {
            const constituencyName = constituencies?.find(c => c.id === constituencyId)?.name;
            const constituencyResults = allResults
                .filter(r => r.constituencyId === constituencyId)
                .map(r => {
                    const election = elections?.find(e => e.id === r.electionId);
                    return election ? { year: election.year, slpVotes: r.slpVotes, uwpVotes: r.uwpVotes, otherVotes: r.otherVotes, totalVotes: r.totalVotes } : null;
                })
                .filter(Boolean);
            return { constituencyName, results: constituencyResults };
        }) || [];
    }

    const newsData = newsArticles?.map(article => ({ title: article.title, summary: article.summary, source: article.source, publishedAt: article.publishedAt }));


    const response = await analyzeConstituencyOutcome({
        constituencyName: selectedConstituency.name,
        electionYear: selectedElection?.year.toString() || 'Current',
        historicalData: JSON.stringify(historicalData),
        pollingData: JSON.stringify({ note: "No recent polling data available for this specific constituency." }),
        candidateInfo: JSON.stringify(candidates),
        nationalSwingData: JSON.stringify(nationalSwingData),
        regionalConstituencyData: JSON.stringify(regionalConstituencyData),
        newsArticles: JSON.stringify(newsData),
        previousAnalysis: result ? JSON.stringify(result) : undefined,
    });

    if (response.error) {
        setError(response.error);
    } else {
        setResult(response as AnalyzeConstituencyOutcomeOutput);
    }
    
    setIsLoading(false);
  };
  
  const { slpParty, uwpParty } = useMemo(() => ({
    slpParty: parties?.find(p => p.acronym === 'SLP'),
    uwpParty: parties?.find(p => p.acronym === 'UWP'),
  }), [parties]);


  const isFormDisabled = isLoading || loadingConstituencies || loadingElections || loadingNews;

  return (
    <div className="space-y-8">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-headline">Constituency Outcome Analyzer</CardTitle>
            <CardDescription>
              Select a constituency and election year to generate a detailed prediction.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Select value={selectedConstituencyId} onValueChange={setSelectedConstituencyId} disabled={isFormDisabled}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a constituency..." />
                </SelectTrigger>
                <SelectContent>
                    {constituencies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={selectedElectionId} onValueChange={setSelectedElectionId} disabled={isFormDisabled}>
                 <SelectTrigger>
                    <SelectValue placeholder="Select an election year..." />
                </SelectTrigger>
                <SelectContent>
                    {elections?.sort((a,b) => b.year - a.year).map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isFormDisabled || !selectedConstituencyId || !selectedElectionId} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Outcome
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {error && (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
            <CardHeader>
                <CardTitle>Analysis for {constituencies?.find(c=>c.id === selectedConstituencyId)?.name}</CardTitle>
                <CardDescription>Prediction for the {selectedElection?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Predicted Winner</p>
                        <p className="text-2xl font-bold" style={{color: result.predictedWinner === 'SLP' ? slpParty?.color : (result.predictedWinner === 'UWP' ? uwpParty?.color : '#8884d8')}}>{result.predictedWinner}</p>
                    </Card>
                     <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Confidence Level</p>
                        <p className="text-2xl font-bold">{result.confidenceLevel}</p>
                    </Card>
                     <Card className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Predicted Margin</p>
                        <p className="text-2xl font-bold">~{result.predictedMargin.toFixed(1)}%</p>
                    </Card>
                </div>

                <div>
                    <h4 className="font-semibold">Analysis</h4>
                    <p className="text-muted-foreground whitespace-pre-line">{result.analysis}</p>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
