
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface MailingListSubscriber {
  id: string;
  firstName: string;
  email: string;
  subscribedAt: any;
}

export default function ManageMailingListPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const subscribersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'mailing_list_subscribers'), orderBy('subscribedAt', 'desc')) : null, [firestore]);
  const { data: subscribers, isLoading, error } = useCollection<MailingListSubscriber>(subscribersQuery);

  const handleDelete = async (subscriberId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'mailing_list_subscribers', subscriberId));
      toast({ title: "Subscriber Removed", description: "The subscriber has been removed from the mailing list." });
    } catch (error) {
      console.error("Error removing subscriber:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not remove subscriber." });
    }
  };

  const handleExport = () => {
    if (!subscribers) {
      toast({ variant: "destructive", title: "Error", description: "No data to export." });
      return;
    }
    const dataToExport = subscribers.map(s => ({
      'First Name': s.firstName,
      'Email': s.email,
      'Subscribed At': s.subscribedAt?.toDate ? new Date(s.subscribedAt.toDate()).toLocaleString() : 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subscribers");
    XLSX.writeFile(workbook, "mailing-list-subscribers.xlsx");
    toast({ title: "Export Successful", description: "Subscribers have been exported." });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Mailing List"
          description="View and manage your mailing list subscribers."
        />
        <Button variant="outline" onClick={handleExport} disabled={!subscribers || subscribers.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribers</CardTitle>
          <CardDescription>A list of all users subscribed to your mailing list.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading subscribers...</p>
          ) : error ? (
            <div className="text-red-600 bg-red-100 p-4 rounded-md">
              <h3 className="font-bold">Error loading subscribers</h3>
              <p>{error.message}</p>
              <p className="text-sm mt-2">Please check the Firestore security rules and console for more details.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscription Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers && subscribers.length > 0 ? (
                  subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell>{subscriber.firstName}</TableCell>
                      <TableCell>{subscriber.email}</TableCell>
                      <TableCell>{subscriber.subscribedAt?.toDate ? new Date(subscriber.subscribedAt.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {subscriber.email} from your mailing list.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(subscriber.id)}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      No subscribers yet.
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
