
'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Party, Election } from '@/lib/types';
import { MultiSelect } from '@/components/multi-select';
import { useFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { uploadFile, deleteFile } from '@/firebase/storage';
import { Loader2 } from 'lucide-react';

interface LogoUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  elections: Election[];
  onSuccess: () => void;
}

const uploadSchema = z.object({
  electionIds: z.array(z.string()).min(1, 'Please select at least one election.'),
  standardLogoFile: z.any().optional(),
  expandedLogoFile: z.any().optional(),
}).refine(data => data.standardLogoFile || data.expandedLogoFile, {
  message: 'At least one logo file is required.',
  path: ['standardLogoFile'],
});

export function LogoUploadDialog({ isOpen, onClose, party, elections, onSuccess }: LogoUploadDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      electionIds: [],
    },
  });

  const electionOptions = elections.map(e => ({ value: e.id, label: e.name }));

  const handleFormSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (!firestore || !party) {
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        return;
    }

    setIsLoading(true);

    try {
        for (const electionId of values.electionIds) {
            const files = {
                standard: values.standardLogoFile,
                expanded: values.expandedLogoFile
            };
            
            const existingLogoQuery = query(
                collection(firestore, 'party_logos'),
                where('partyId', '==', party.id),
                where('electionId', '==', electionId)
            );
            const existingLogoSnap = await getDocs(existingLogoQuery);
            const existingLogoDoc = existingLogoSnap.docs[0];

            let standardUrl = existingLogoDoc?.data()?.logoUrl;
            let expandedUrl = existingLogoDoc?.data()?.expandedLogoUrl;

            if (files.standard) {
                if (standardUrl) await deleteFile(standardUrl).catch(console.warn);
                standardUrl = await uploadFile(files.standard, `logos/${party.id}_${electionId}_std.png`);
            }
            if (files.expanded) {
                if (expandedUrl) await deleteFile(expandedUrl).catch(console.warn);
                expandedUrl = await uploadFile(files.expanded, `logos/${party.id}_${electionId}_exp.png`);
            }

            const dataToSave = {
                partyId: party.id,
                electionId,
                logoUrl: standardUrl || '',
                expandedLogoUrl: expandedUrl || '',
            };

            if (existingLogoDoc) {
                await updateDoc(doc(firestore, 'party_logos', existingLogoDoc.id), dataToSave);
            } else {
                await addDoc(collection(firestore, 'party_logos'), dataToSave);
            }
        }
        
        onSuccess();
        form.reset();
        onClose();

    } catch (error) {
        console.error("Error uploading logos:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload logos.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Logos for {party?.name}</DialogTitle>
          <DialogDescription>Select one or more elections and upload the logos to apply.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="electionIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Elections</FormLabel>
                            <MultiSelect
                                options={electionOptions}
                                selected={field.value}
                                onChange={field.onChange}
                                placeholder="Select elections..."
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="standardLogoFile"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Standard Logo (Square)</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/png, image/jpeg" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                    control={form.control}
                    name="expandedLogoFile"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Expanded Logo (Banner)</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/png, image/jpeg" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Upload
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
