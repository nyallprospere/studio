
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserMap } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const getSeatCountsFromMapData = (mapData: UserMap['mapData']) => {
    let slp = 0, uwp = 0, ind = 0;
    mapData.forEach(item => {
        if (item.politicalLeaning === 'slp') slp++;
        else if (item.politicalLeaning === 'uwp') uwp++;
        else if (item.politicalLeaning === 'ind') ind++;
    });
    return { slp, uwp, ind };
}

function MapCardSkeleton() {
    return <Skeleton className="h-64 w-full" />;
}

export default function MapSubmissionsPage() {
  const { firestore } = useFirebase();
  const [visibleMapCount, setVisibleMapCount] = useState(12);

  const userMapsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'user_maps'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allUserMaps, isLoading: loadingUserMaps } = useCollection<UserMap>(userMapsQuery);

  const visibleMaps = useMemo(() => {
    return allUserMaps?.slice(0, visibleMapCount);
  }, [allUserMaps, visibleMapCount]);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="User Map Submissions"
        description="A gallery of all election predictions created by users."
      />
      <div className="mt-8">
        {loadingUserMaps ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <MapCardSkeleton key={i} />)}
          </div>
        ) : visibleMaps && visibleMaps.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleMaps.map(map => {
                const { slp, uwp, ind } = getSeatCountsFromMapData(map.mapData);
                return (
                  <Card key={map.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <Link href={`/maps/${map.id}`}>
                        <div className="relative aspect-video bg-muted">
                          {map.imageUrl ? (
                            <Image src={map.imageUrl} alt="User created map" fill className="object-contain" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No Image</div>
                          )}
                        </div>
                      </Link>
                      <div className="p-4">
                        <p className="font-semibold text-sm">
                          SLP {slp} | UWP {uwp} | IND {ind}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created on {map.createdAt ? new Date(map.createdAt?.toDate()).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="gap-2 p-4 pt-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{map.likeCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ThumbsDown className="h-4 w-4" />
                        <span>{map.dislikeCount || 0}</span>
                      </div>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
            {allUserMaps && visibleMapCount < allUserMaps.length && (
              <div className="flex justify-center mt-8">
                <Button onClick={() => setVisibleMapCount(prev => prev + 12)}>Load More</Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>No user-submitted maps found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
