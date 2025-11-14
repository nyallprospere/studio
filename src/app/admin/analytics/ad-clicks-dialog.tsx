'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Ad, AdClick } from '@/lib/types';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdClicksDialogProps {
    isOpen: boolean;
    onClose: () => void;
    ad: Ad | null;
    clicks: AdClick[];
    isLoading: boolean;
}

export function AdClicksDialog({ isOpen, onClose, ad, clicks, isLoading }: AdClicksDialogProps) {

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Click Details for "{ad?.name}"</DialogTitle>
                    <DialogDescription>A log of all recorded clicks for this ad campaign.</DialogDescription>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>IP Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">Loading clicks...</TableCell>
                                    </TableRow>
                                ) : clicks.length > 0 ? (
                                    clicks.map(click => (
                                        <TableRow key={click.id}>
                                            <TableCell>{click.timestamp ? format(click.timestamp.toDate(), 'PPpp') : 'N/A'}</TableCell>
                                            <TableCell>{click.city && click.country ? `${click.city}, ${click.country}` : 'Unknown'}</TableCell>
                                            <TableCell className="font-mono text-xs">{click.ipAddress || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No clicks recorded for this ad yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
