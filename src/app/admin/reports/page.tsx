
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, where, Timestamp } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Check, ShieldAlert, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';


export default function ManageReportsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [date, setDate] = useState<DateRange | undefined>();
  const [datePreset, setDatePreset] = useState('all');

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'reports'), orderBy('reportedAt', 'desc'));
    if (date?.from) {
      q = query(q, where('reportedAt', '>=', Timestamp.fromDate(date.from)));
    }
    if (date?.to) {
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999);
        q = query(q, where('reportedAt', '<=', Timestamp.fromDate(toDate)));
    }
    return q;
  }, [firestore, date]);
  
  const { data: reports, isLoading } = useCollection<Report>(reportsQuery);

  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending');

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    return reports.filter(r => r.status === filter);
  }, [reports, filter]);

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

  const handleMarkResolved = async (reportId: string) => {
    if (!firestore) return;
    const reportRef = doc(firestore, 'reports', reportId);
    try {
      await updateDoc(reportRef, { status: 'resolved' });
      toast({ title: 'Report Resolved', description: 'The report has been marked as resolved.' });
    } catch (error) {
      console.error('Error resolving report:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not resolve report.' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Reports"
        description="Review and manage reported comments."
      />
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Reported Comments</CardTitle>
              <CardDescription>
                Showing {filter} reports.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
              <Button variant={filter === 'pending' ? 'secondary' : 'outline'} onClick={() => setFilter('pending')}>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Pending
              </Button>
              <Button variant={filter === 'resolved' ? 'secondary' : 'outline'} onClick={() => setFilter('resolved')}>
                <Check className="mr-2 h-4 w-4" />
                Resolved
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Loading reports...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length > 0 ? (
                  filteredReports.map(report => (
                    <TableRow key={report.id}>
                      <TableCell>{format(report.reportedAt.toDate(), 'PPP')}</TableCell>
                      <TableCell className="max-w-sm">
                        <p className="truncate">{report.commentText}</p>
                      </TableCell>
                      <TableCell>{report.commentAuthor}</TableCell>
                      <TableCell>
                          <Button asChild variant="link" className="p-0 h-auto">
                             <Link href={`/news/${report.articleId}`} target="_blank">View Article</Link>
                          </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        {filter === 'pending' && (
                          <Button size="sm" onClick={() => handleMarkResolved(report.id)}>
                            Mark as Resolved
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No {filter} reports.
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
