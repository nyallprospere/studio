
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import type { AdClick, Ad } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdClickAnalyticsPage() {
    const { adId } = useParams();
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();

    const adRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'ads', adId as string) : null), [firestore, user, adId]);
    const { data: ad, isLoading: loadingAd } = useDoc<Ad>(adRef);

    const clicksQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'ad_clicks'), where('adId', '==', adId), orderBy('timestamp', 'desc'));
    }, [firestore, user, adId]);

    const { data: clicks, isLoading: loadingClicks } = useCollection<AdClick>(clicksQuery);

    const isLoading = isUserLoading || loadingAd || loadingClicks;

    if (isUserLoading) {
        return <p>Loading user...</p>
    }

    if (!user) {
        return <p>You must be logged in to view this page.</p>
    }


    return (
        <div className="container mx-auto py-10">
            <div className="flex items-center gap-4 mb-8">
                 <Button asChild variant="outline" size="icon">
                    <Link href="/admin/analytics">
                        <ArrowLeft />
                    </Link>
                </Button>
                <PageHeader
                    title={loadingAd ? "Loading..." : `Click Analytics for "${ad?.name}"`}
                    description="A detailed log of every click for this advertisement."
                />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Click Details</CardTitle>
                    <CardDescription>
                        Total Clicks: {isLoading ? '...' : clicks?.length || 0}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Loading click data...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Country</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clicks && clicks.length > 0 ? (
                                    clicks.map((click) => (
                                        <TableRow key={click.id}>
                                            <TableCell>{click.timestamp ? format(click.timestamp.toDate(), 'PPP, p') : 'N/A'}</TableCell>
                                            <TableCell>{click.ipAddress || 'N/A'}</TableCell>
                                            <TableCell>{click.city || 'N/A'}</TableCell>
                                            <TableCell>{click.country || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No clicks recorded for this ad yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
