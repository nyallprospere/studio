

'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserMap } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, Trash2 } from 'lucide-react';
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
import { doc, deleteDoc } from 'firebase/firestore';

export default function ManageMapSubmissionsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const mapsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'user_maps'), orderBy('createdAt', 'desc')) : null, [firestore]);
    const { data: userMaps, isLoading } = useCollection<UserMap>(mapsQuery);

    const handleDelete = async (mapId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'user_maps', mapId));
            toast({ title: 'Map Deleted', description: 'The user-submitted map has been successfully deleted.' });
        } catch (error) {
            console.error('Error deleting map:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the map.' });
        }
    }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Map Submissions"
        description="View user-submitted election map predictions."
      />
      <Card>
        <CardHeader>
            <CardTitle>User Submissions</CardTitle>
            <CardDescription>A list of all shared or completed maps from users.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <p>Loading submissions...</p> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Creation Date</TableHead>
                            <TableHead>Map ID</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {userMaps && userMaps.length > 0 ? (
                            userMaps.map(map => (
                                <TableRow key={map.id}>
                                    <TableCell>{new Date(map.createdAt?.toDate()).toLocaleString()}</TableCell>
                                    <TableCell>{map.id}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="icon">
                                            <Link href={`/maps/${map.id}`} target="_blank">
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete this submitted map. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(map.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    No map submissions yet.
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
