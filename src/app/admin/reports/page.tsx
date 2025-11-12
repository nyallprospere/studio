'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, where, Timestamp, deleteDoc } from 'firebase/firestore';
import type { Report, NewsArticle, Comment } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Check, ShieldAlert, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionComponent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MainLayout } from '@/components/layout/main-layout';

function ContextDialog({ report, isOpen, onClose }: { report: Report; isOpen: boolean; onClose: () => void; }) {
    const { firestore } = useFirebase();

    const articleRef = useMemoFirebase(() => firestore && report ? doc(firestore, 'news', report.articleId) : null, [firestore, report]);
    const { data: article, isLoading: loadingArticle } = useDoc<NewsArticle>(articleRef);
    
    const commentsQuery = useMemoFirebase(() => firestore && report ? query(collection(firestore, 'news', report.articleId, 'comments'), orderBy('createdAt', 'asc')) : null, [firestore, report]);
    const { data: comments, isLoading: loadingComments } = useCollection<Comment>(commentsQuery);

    const isLoading = loadingArticle || loadingComments;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Comment Context</DialogTitle>
                    <DialogDescription>Viewing the context for a reported comment.</DialogDescription>
                </DialogHeader>
                {isLoading ? <p>Loading context...</p> : (
                    <ScrollArea className="max-h-[60vh] pr-4">
                        {article && (
                            <div className="mb-6">
                                <h3 className="font-semibold text-lg">{article.title}</h3>
                                <p className="text-sm text-muted-foreground">From article: <Link href={`/news/${article.id}`} target="_blank" className="underline">{article.title}</Link></p>
                            </div>
                        )}
                        <div className="space-y-4">
                            {comments?.map(comment => (
                                <div key={comment.id} className={cn("flex items-start gap-3 p-3 rounded-lg", comment.id === report.commentId && 'bg-yellow-100 dark:bg-yellow-900/50 ring-2 ring-yellow-500')}>
                                     <Avatar className="h-8 w-8">
                                        <AvatarFallback>{(comment.author || 'A').charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-semibold">{comment.author}</p>
                                        <p className="text-sm text-muted-foreground">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default function ManageReportsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [date, setDate] = useState<DateRange | undefined>();
  const [datePreset, setDatePreset] = useState('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

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
      const contextualError = new FirestorePermissionError({
        path: reportRef.path,
        operation: 'update',
        requestResourceData: { status: 'resolved' },
      });
      errorEmitter.emit('permission-error', contextualError);
    }
  };

  const handleDeleteComment = async (report: Report) => {
    if (!firestore) return;
    const commentRef = doc(firestore, 'news', report.articleId, 'comments', report.commentId);
    const reportRef = doc(firestore, 'reports', report.id);
    try {
        await deleteDoc(commentRef);
        await updateDoc(reportRef, { status: 'resolved' });
        toast({ title: 'Comment Deleted', description: 'The reported comment has been deleted.'});
    } catch (error) {
        const contextualError = new FirestorePermissionError({ path: commentRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  return (
    <MainLayout>
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
                    <TableHead>Context</TableHead>
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
                            <Button variant="ghost" size="icon" onClick={() => setSelectedReport(report)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        <TableCell className="text-right">
                            {filter === 'pending' && (
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleMarkResolved(report.id)}>
                                Mark Resolved
                                </Button>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Comment
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescriptionComponent>
                                        This will permanently delete the comment and resolve this report. This action cannot be undone.
                                    </AlertDialogDescriptionComponent>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteComment(report)}>Delete Comment</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
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
        {selectedReport && (
            <ContextDialog
                report={selectedReport}
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
            />
        )}
        </div>
    </MainLayout>
  );
}
