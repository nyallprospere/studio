'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, where, Timestamp } from 'firebase/firestore';
import type { UserMap } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/hooks/use-toast';
import { deleteFile } from '@/firebase/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { DataTable } from './data-table';
import { getColumns } from './columns';

export default function MapSubmissionsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [datePreset, setDatePreset] = React.useState('all');

  const userMapsQuery = useMemoFirebase(() => {
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

  const { data: allUserMaps, isLoading: loadingUserMaps } = useCollection<UserMap>(userMapsQuery);

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
  };

  const handleDelete = async (map: UserMap) => {
    if (!firestore) {
      toast({ title: 'Error', description: 'Firestore not initialized.', variant: 'destructive' });
      return;
    }

    try {
      if (map.imageUrl) {
        await deleteFile(map.imageUrl);
      }
      await deleteDoc(doc(firestore, 'user_maps', map.id));
      toast({ title: 'Map Deleted', description: 'The user map has been successfully deleted.' });
    } catch (error) {
      console.error("Failed to delete map:", error);
      toast({ title: 'Error Deleting Map', description: 'There was an error deleting the map. Check the console for details.', variant: 'destructive' });
    }
  };

  const columns = React.useMemo(() => getColumns(handleDelete), []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <PageHeader
          title="User Map Submissions"
          description="A gallery of all election predictions created by users."
        />
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={handleDatePresetChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-8">
        {loadingUserMaps ? (
          <p>Loading maps...</p>
        ) : (
          <DataTable columns={columns} data={allUserMaps || []} />
        )}
      </div>
    </div>
  );
}
