'use client';

import { useState, useEffect } from 'react';
import { constituencies as constituenciesData } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function ConstituencyCardSkeleton() {
    return (
        <Card className="flex flex-col overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    );
}

export default function ConstituenciesPage() {
    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            const enrichedConstituencies = constituenciesData.map(c => ({
                ...c,
                id: c.id,
                mapImageUrl: PlaceHolderImages.find(p => p.id === c.mapImageId)?.imageUrl || ''
            }));
            setConstituencies(enrichedConstituencies as Constituency[]);
            setLoading(false);
        }, 500);
    }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Constituencies"
        description="Explore the 17 electoral districts of St. Lucia."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ConstituencyCardSkeleton key={i} />)
        ) : (
            constituencies?.map((constituency) => (
                <Card key={constituency.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                {constituency.mapImageUrl && (
                    <div className="relative h-40 w-full">
                    <Image
                        src={constituency.mapImageUrl}
                        alt={`Map of ${constituency.name}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    </div>
                )}
                <CardHeader>
                    <CardTitle className="font-headline text-xl">{constituency.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Population: {constituency.demographics.population.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2 text-primary" />
                    <span>Registered Voters: {constituency.demographics.registeredVoters.toLocaleString()}</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/constituencies/${constituency.id}`}>View Details</Link>
                    </Button>
                </CardFooter>
                </Card>
            ))
        )}
      </div>
    </div>
  );
}
