'use client';
import { useCollection } from '@/firebase/hooks/use-collection';
import { getPartyById, getConstituencyById } from '@/lib/data';
import type { ElectionYearResult, Party, Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ResultsPage() {
  const { data: historicalResults, loading: loadingResults } = useCollection<ElectionYearResult>('historicalResults', { orderBy: ['year', 'desc'] });
  const { data: parties, loading: loadingParties } = useCollection<Party>('parties');
  const { data: constituencies, loading: loadingConstituencies } = useCollection<Constituency>('constituencies');

  const loading = loadingResults || loadingParties || loadingConstituencies;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Past Election Results"
          description="A historical overview of St. Lucia's general elections."
        />
        <p>Loading results...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Past Election Results"
        description="A historical overview of St. Lucia's general elections since 1974."
      />
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue={historicalResults?.[0]?.year.toString()}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {historicalResults?.map((result) => (
                <TabsTrigger key={result.year} value={result.year.toString()}>
                  {result.year}
                </TabsTrigger>
              ))}
            </TabsList>

            {historicalResults?.map((result) => (
              <TabsContent key={result.year} value={result.year.toString()}>
                <div className="mt-6">
                  <h3 className="text-2xl font-headline mb-4">
                    {result.year} Election Summary
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {result.summary.map((summaryItem) => {
                      const party = getPartyById(summaryItem.partyId, parties || []);
                      return (
                        <Card key={summaryItem.partyId} style={{ borderLeftColor: party?.color, borderLeftWidth: '4px' }}>
                          <CardHeader>
                            <CardTitle className="text-lg">{party?.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{summaryItem.seats} Seats</div>
                            <p className="text-sm text-muted-foreground">
                              {summaryItem.totalVotes.toLocaleString()} votes
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <h3 className="text-2xl font-headline my-6">Constituency Breakdown</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Constituency</TableHead>
                        <TableHead>Winning Candidate</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead className="text-right">Votes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.constituencyResults.length > 0 ? result.constituencyResults.map((cr, index) => {
                        const constituency = getConstituencyById(cr.constituencyId, constituencies || []);
                        const party = getPartyById(cr.partyId, parties || []);
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{constituency?.name || cr.constituencyId}</TableCell>
                            <TableCell>{cr.candidateName}</TableCell>
                            <TableCell>
                                <span className="font-semibold" style={{ color: party?.color }}>{party?.acronym}</span>
                            </TableCell>
                            <TableCell className="text-right">{cr.votes.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">Detailed constituency data not available for this year.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
