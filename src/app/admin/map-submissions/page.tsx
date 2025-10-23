
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, where, Timestamp, doc, setDoc } from 'firebase/firestore';
import type { UserMap, SiteSettings } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, Trash2, Calendar as CalendarIcon, Download, Share2 } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

const shareSettingsSchema = z.object({
  defaultShareTitle: z.string().min(1, 'Title is required'),
  defaultShareDescription: z.string().min(1, 'Description is required'),
});

function SharePreview({ title, description }: { title: string; description: string }) {
    return (
        <div className="mt-6 border p-4 rounded-lg space-y-2 bg-muted/50">
            <h4 className="text-sm font-semibold">Share Preview</h4>
            <div className="border rounded-lg bg-background overflow-hidden">
                <div className="relative aspect-video bg-gray-200">
                    <Image
                        src="https://picsum.photos/seed/map-preview/1200/630"
                        alt="Map preview"
                        fill
                        className="object-cover"
                        data-ai-hint="map"
                    />
                </div>
                <div className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">lucianvotes.com</p>
                    <p className="text-sm font-bold">{title || 'Your Share Title'}</p>
                    <p className="text-xs text-muted-foreground">{description || 'Your share description will appear here.'}</p>
                </div>
            </div>
        </div>
    )
}

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

    const siteSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
    const { data: siteSettings, isLoading: loadingSiteSettings } = useDoc<SiteSettings>(siteSettingsRef);

    const form = useForm<z.infer<typeof shareSettingsSchema>>({
        resolver: zodResolver(shareSettingsSchema),
        defaultValues: {
            defaultShareTitle: '',
            defaultShareDescription: '',
        },
    });
    
    const watchedTitle = form.watch('defaultShareTitle');
    const watchedDescription = form.watch('defaultShareDescription');

    useEffect(() => {
        if (siteSettings) {
            form.reset({
                defaultShareTitle: siteSettings.defaultShareTitle || '',
                defaultShareDescription: siteSettings.defaultShareDescription || '',
            });
        }
    }, [siteSettings, form]);

    const handleShareSettingsSubmit = async (values: z.infer<typeof shareSettingsSchema>) => {
        if (!firestore || !siteSettingsRef) return;
        try {
            await setDoc(siteSettingsRef, values, { merge: true });
            toast({ title: 'Settings Updated', description: 'Default share settings have been saved.' });
        } catch (error) {
            console.error('Error saving share settings:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save share settings.' });
        }
    }


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
            const tossups = map.mapData.filter(d => d.politicalLeaning === 'tossup').length;
            return {
                ...map,
                slpSeats,
                uwpSeats,
                tossups,
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
            'Tossups': map.tossups,
            'Map URL': `${window.location.origin}/maps/${map.id}`
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
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
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
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>SLP</TableHead>
                                    <TableHead>UWP</TableHead>
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
                                            <TableCell>{map.city || 'N/A'}</TableCell>
                                            <TableCell>{map.country || 'N/A'}</TableCell>
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
                                        <TableCell colSpan={8} className="text-center h-24">
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
        <div>
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5" /> Social Sharing
                </CardTitle>
                <CardDescription>
                    Set the default text for social media posts when users share their maps.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingSiteSettings ? <p>Loading...</p> : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleShareSettingsSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="defaultShareTitle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Default Share Title</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="defaultShareDescription"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Default Share Description</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit">Save Share Settings</Button>
                            </form>
                        </Form>
                    )}
                    <SharePreview title={watchedTitle} description={watchedDescription} />
                </CardContent>
            </Card>
        </div>
       </div>
    </div>
  );
}
