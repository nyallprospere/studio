
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, where, Timestamp, doc } from 'firebase/firestore';
import type { UserMap, SiteSettings } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, Trash2, Calendar as CalendarIcon, Download, Image as ImageIcon } from 'lucide-react';
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
import { deleteDoc } from 'firebase/firestore';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Image from 'next/image';

export default function ManageMapSubmissionsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [date, setDate] = useState<DateRange | undefined>();
    const [countryFilter, setCountryFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [datePreset, setDatePreset] = useState('all');

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

    const handleDatePresetChange = (preset: string) => {
        setDatePreset(preset);
        const now = new Date();
        switch (preset) {
            case 'all':
                setDate(undefined);
                break;
            case 'day':
                setDate({ from: startOfDay(now), to: endOfDay(now) });
                break;
            case 'week':
                setDate({ from: startOfWeek(now), to: endOfWeek(now) });
                break;
            case 'month':
                setDate({ from: startOfMonth(now), to: endOfMonth(now) });
                break;
            case 'year':
                setDate({ from: startOfYear(now), to: endOfYear(now) });
                break;
            default:
                setDate(undefined);
        }
    }

    const processedMaps = useMemo(() => {
        if (!userMaps) return [];
        return userMaps.map(map => {
            const slpSeats = map.mapData.filter(d => d.politicalLeaning === 'slp').length;
            const uwpSeats = map.mapData.filter(d => d.politicalLeaning === 'uwp').length;
            const indSeats = map.mapData.filter(d => d.politicalLeaning === 'ind').length;
            return {
                ...map,
                slpSeats,
                uwpSeats,
                indSeats,
            };
        }).filter(map => {
            const countryMatch = countryFilter ? map.country?.toLowerCase().includes(countryFilter.toLowerCase()) : true;
            const cityMatch = cityFilter ? map.city?.toLowerCase().includes(cityFilter.toLowerCase()) : true;
            return countryMatch && cityMatch;
        });
    }, [userMaps, countryFilter, cityFilter]);

    const handleExport = () => {
        if (!processedMaps || processedMaps.length === 0) {
            toast({ variant: 'destructive', title: 'No data to export' });
            return;
        }

        const dataToExport = processedMaps.map(map => ({
            'Date': map.createdAt?.toDate ? new Date(map.createdAt.toDate()).toLocaleString() : 'N/A',
            'IP Address': map.ipAddress || 'N/A',
            'City': map.city || 'N/A',
            'Country': map.country || 'N/A',
            'SLP': map.slpSeats,
            'UWP': map.uwpSeats,
            'IND': map.indSeats,
            'Map URL': `${window.location.origin}/maps/${map.id}`,
            'Image URL': map.imageUrl || 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Map Submissions");
        XLSX.writeFile(workbook, `map_submissions_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: 'Export Successful', description: 'Map submissions have been exported.' });
    };

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
      </div>
       <div className="grid grid-cols-1 gap-8">
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>User Submissions</CardTitle>
                    <CardDescription>A list of all shared or completed maps from users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <Input 
                            placeholder="Filter by city..."
                            value={cityFilter}
                            onChange={(e) => setCityFilter(e.target.value)}
                            className="w-48"
                        />
                        <Input 
                            placeholder="Filter by country..."
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className="w-48"
                        />
                        <Select value={datePreset} onValueChange={handleDatePresetChange}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="day">Day</SelectItem>
                                <SelectItem value="week">Week</SelectItem>
                                <SelectItem value="month">Month</SelectItem>
                                <SelectItem value="year">Year</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </div>
                    {isLoading ? <p>Loading submissions...</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Image</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>SLP</TableHead>
                                    <TableHead>UWP</TableHead>
                                    <TableHead>IND</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedMaps && processedMaps.length > 0 ? (
                                    processedMaps.map(map => (
                                        <TableRow key={map.id}>
                                            <TableCell>{map.createdAt?.toDate ? new Date(map.createdAt.toDate()).toLocaleString() : 'N/A'}</TableCell>
                                            <TableCell>
                                                {map.imageUrl ? (
                                                    <a href={map.imageUrl} target="_blank" rel="noopener noreferrer">
                                                        <ImageIcon className="h-5 w-5" />
                                                    </a>
                                                ) : 'N/A'}
                                            </TableCell>
                                            <TableCell>{map.ipAddress || 'N/A'}</TableCell>
                                            <TableCell>{map.city || 'N/A'}</TableCell>
                                            <TableCell>{map.country || 'N/A'}</TableCell>
                                            <TableCell>{map.slpSeats}</TableCell>
                                            <TableCell>{map.uwpSeats}</TableCell>
                                            <TableCell>{map.indSeats}</TableCell>
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
                                        <TableCell colSpan={9} className="text-center h-24">
                                            No map submissions match the current filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
       </div>
    </div>
  );
}
