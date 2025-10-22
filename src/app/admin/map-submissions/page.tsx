

'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import type { UserMap } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, Trash2, Calendar as CalendarIcon } from 'lucide-react';
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
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ManageMapSubmissionsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [date, setDate] = useState<DateRange | undefined>();

    const mapsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'user_maps'), orderBy('createdAt', 'desc'));
        if (date?.from) {
            q = query(q, where('createdAt', '>=', Timestamp.fromDate(date.from)));
        }
        if (date?.to) {
            const toDate = new Date(date.to);
            toDate.setHours(23, 59, 59, 999);
            q = query(q, where('createdAt', '<=', Timestamp.fromDate(toDate)));
        }
        return q;
    }, [firestore, date]);

    const { data: userMaps, isLoading } = useCollection<UserMap>(mapsQuery);

    const processedMaps = useMemo(() => {
        if (!userMaps) return [];
        return userMaps.map(map => {
            const slpSeats = map.mapData.filter(d => d.politicalLeaning === 'slp').length;
            const uwpSeats = map.mapData.filter(d => d.politicalLeaning === 'uwp').length;
            const tossups = map.mapData.filter(d => d.politicalLeaning === 'tossup').length;
            return {
                ...map,
                slpSeats,
                uwpSeats,
                tossups,
            };
        });
    }, [userMaps]);


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
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Map Submissions"
          description="View user-submitted election map predictions."
        />
         <Popover>
            <PopoverTrigger asChild>
                <Button
                id="date"
                variant={"outline"}
                className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                    date.to ? (
                    <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                    </>
                    ) : (
                    format(date.from, "LLL dd, y")
                    )
                ) : (
                    <span>Pick a date range</span>
                )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
      </div>
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
                            <TableHead>IP Address</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>SLP Seats</TableHead>
                            <TableHead>UWP Seats</TableHead>
                            <TableHead>Tossups</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedMaps && processedMaps.length > 0 ? (
                            processedMaps.map(map => (
                                <TableRow key={map.id}>
                                    <TableCell>{map.createdAt?.toDate ? new Date(map.createdAt.toDate()).toLocaleString() : 'N/A'}</TableCell>
                                    <TableCell>{map.ipAddress || 'N/A'}</TableCell>
                                    <TableCell>{map.city && map.country ? `${map.city}, ${map.country}` : 'N/A'}</TableCell>
                                    <TableCell>{map.slpSeats}</TableCell>
                                    <TableCell>{map.uwpSeats}</TableCell>
                                    <TableCell>{map.tossups}</TableCell>
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
                                <TableCell colSpan={7} className="text-center h-24">
                                    No map submissions in this date range.
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
