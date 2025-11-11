
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, query, where, updateDoc, Timestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import type { Election } from '@/lib/types';
import Countdown from '@/components/countdown';


export default function ManageCountdownPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [isSaving, setIsSaving] = useState(false);

    const electionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'elections'), where('isCurrent', '==', true)) : null, [firestore]);
    const { data: currentElections, isLoading } = useCollection<Election>(electionsQuery);
    
    const currentElection = useMemo(() => currentElections?.[0], [currentElections]);
    const electionDate = useMemo(() => currentElection?.date ? (currentElection.date as unknown as Timestamp).toDate() : undefined, [currentElection]);

    useEffect(() => {
        if (electionDate) {
            setSelectedDate(electionDate);
        }
    }, [electionDate]);

    const handleSaveDate = async () => {
        if (!firestore || !currentElection || !selectedDate) {
            toast({ variant: 'destructive', title: 'Error', description: 'No current election found or date not selected.' });
            return;
        }

        setIsSaving(true);
        const electionDocRef = doc(firestore, 'elections', currentElection.id);

        try {
            await updateDoc(electionDocRef, { date: Timestamp.fromDate(selectedDate) });
            toast({ title: 'Countdown Updated', description: 'The election countdown has been successfully updated.' });
        } catch (error) {
            const contextualError = new FirestorePermissionError({
                path: electionDocRef.path,
                operation: 'update',
                requestResourceData: { date: selectedDate },
            });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader
                title="Manage Countdown"
                description="Set the date for the homepage election countdown."
            />

            <div className="grid md:grid-cols-2 gap-8 mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Set Election Date</CardTitle>
                        <CardDescription>Select the date for the next general election.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            className="rounded-md border"
                        />
                        <Button onClick={handleSaveDate} disabled={isSaving || !selectedDate} className="mt-4">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Date
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Live Preview</CardTitle>
                        <CardDescription>This is how the countdown will appear on the homepage.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedDate ? <Countdown date={selectedDate} /> : <p className="text-center text-muted-foreground">Select a date to see a preview.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    
