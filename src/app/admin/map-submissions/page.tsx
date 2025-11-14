'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { UserMap } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { deleteFile } from '@/firebase/storage';

const getSeatCountsFromMapData = (mapData: UserMap['mapData']) => {
    let slp = 0, uwp = 0, ind = 0;
    mapData.forEach(item => {
        if (item.politicalLeaning === 'slp') slp++;
        else if (item.politicalLeaning === 'uwp') uwp++;
        else if (item.politicalLeaning === 'ind') ind++;
    });
    return { slp, uwp, ind };
}

export default function MapSubmissionsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [visibleMapCount, setVisibleMapCount] = useState(25);

  const userMapsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'user_maps'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allUserMaps, isLoading: loadingUserMaps } = useCollection<UserMap>(userMapsQuery);
  
  const handleDelete = async (map: UserMap) => {
    if (!firestore) {
        toast({ title: 'Error', description: 'Firestore not initialized.', variant: 'destructive'});
        return;
    };

    try {
        // Delete image from storage if it exists
        if(map.imageUrl) {
            await deleteFile(map.imageUrl);
        }
        // Delete document from firestore
        await deleteDoc(doc(firestore, 'user_maps', map.id));
        toast({ title: 'Map Deleted', description: 'The user map has been successfully deleted.' });
    } catch(error) {
        console.error("Failed to delete map:", error);
        toast({ title: 'Error Deleting Map', description: 'There was an error deleting the map. Check the console for details.', variant: 'destructive' });
    }
  }

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
        <Card>
            <CardContent className="p-0">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Map</TableHead>
                        <TableHead>Prediction</TableHead>
                        <TableHead>Submission Details</TableHead>
                        <TableHead>Likes</TableHead>
                        <TableHead>Dislikes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {loadingUserMaps ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-16 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                             <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                        </TableRow>
                    ))
                ) : visibleMaps && visibleMaps.length > 0 ? (
                    visibleMaps.map(map => {
                        const { slp, uwp, ind } = getSeatCountsFromMapData(map.mapData);
                        return (
                            <TableRow key={map.id}>
                                <TableCell>
                                    <Link href={`/maps/${map.id}`}>
                                        <div className="relative aspect-video w-32 bg-muted rounded-md overflow-hidden">
                                        {map.imageUrl ? (
                                            <Image src={map.imageUrl} alt="User created map" fill className="object-contain" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No Image</div>
                                        )}
                                        </div>
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <p className="font-semibold">
                                        SLP {slp} | UWP {uwp} | IND {ind}
                                    </p>
                                </TableCell>
                                 <TableCell>
                                    <p className="text-sm text-muted-foreground">
                                        {map.createdAt ? new Date(map.createdAt?.toDate()).toLocaleString() : 'N/A'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {map.city && map.country ? `${map.city}, ${map.country}`: (map.ipAddress || 'Unknown Location')}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <ThumbsUp className="h-4 w-4 text-green-500" />
                                        <span>{map.likeCount || 0}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <ThumbsDown className="h-4 w-4 text-red-500" />
                                        <span>{map.dislikeCount || 0}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete this user map. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(map)}>
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No user maps found.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
                </Table>
                 {allUserMaps && visibleMapCount < allUserMaps.length && (
                    <div className="flex justify-center p-4">
                        <Button onClick={() => setVisibleMapCount(prev => prev + 25)}>Load More</Button>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
