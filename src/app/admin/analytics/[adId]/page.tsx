
'use client';

import { useParams } from 'next/navigation';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import type { Ad, AdClick } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdClickDetailsPage() {
    const { adId } = useParams();
    const { firestore } = useFirebase();

    const adRef = useMemoFirebase(() => (firestore && adId ? doc(firestore, 'ads', adId as string) : null), [firestore, adId]);
    const { data: ad, isLoading: loadingAd } = useDoc<Ad>(adRef);

    const clicksQuery = useMemoFirebase(() => (firestore && adId ? query(collection(firestore, 'ad_clicks'), where('adId', '==', adId), orderBy('timestamp', 'desc')) : null), [firestore, adId]);
    const { data: clicks, isLoading: loadingClicks } = useCollection<AdClick>(clicksQuery);

    const isLoading = loadingAd || loadingClicks;

    return (
        <div className="container mx-auto py-10">
            <div className="flex items-center gap-4 mb-8">
                <Button asChild variant="outline" size="icon">
                    <Link href="/admin/analytics">
                        <ArrowLeft />
                        <span className="sr-only">Back to Analytics</span>
                    </Link>
                </Button>
                 <PageHeader
                    title={ad ? `Click Details for "${ad.name}"` : 'Loading...'}
                    description="A detailed log of every click for this ad campaign."
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Click Log</CardTitle>
                    <CardDescription>
                        {isLoading ? 'Loading clicks...' : `Found ${clicks?.length || 0} clicks.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead>IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Loading click data...</TableCell>
                                </TableRow>
                            ) : clicks && clicks.length > 0 ? (
                                clicks.map(click => (
                                    <TableRow key={click.id}>
                                        <TableCell>{format(click.timestamp.toDate(), 'PPP p')}</TableCell>
                                        <TableCell>{click.city || 'N/A'}</TableCell>
                                        <TableCell>{click.country || 'N/A'}</TableCell>
                                        <TableCell className="font-mono text-xs">{click.ipAddress || 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No clicks recorded for this ad yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
