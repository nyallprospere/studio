
'use client';

import { useState } from 'react';
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
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, query, where, getDocs, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { uploadFile, deleteFile } from '@/firebase/storage';
import { Loader2 } from 'lucide-react';
import { Command, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  standardLogoFiles: z.any().optional(),
  expandedLogoFile: z.any().optional(),
}).refine(data => data.standardLogoFile || data.expandedLogoFile || (data.standardLogoFiles && data.standardLogoFiles.length > 0), {
  message: 'At least one logo file is required.',
  path: ['standardLogoFile'],
});

export function LogoUploadDialog({ isOpen, onClose, party, elections, onSuccess }: LogoUploadDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isIndependent = party?.id === 'independent';

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      electionIds: [],
    },
  });

  const electionOptions = elections.map(e => ({ 
    value: e.id, 
    label: e.name.replace(' General Election', '').replace('(April 6th)', '(Apr 6)').replace('(April 30th)', '(Apr 30)') 
  })).sort((a,b) => b.label.localeCompare(a.label));

  const handleFormSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (!firestore || !party) {
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        return;
    }

    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        const standardFiles = isIndependent ? values.standardLogoFiles : (values.standardLogoFile ? [values.standardLogoFile] : []);

        const loopCount = isIndependent ? (standardFiles && standardFiles.length > 0 ? standardFiles.length : 1) : 1;

        for (const electionId of values.electionIds) {
            for (let i = 0; i < loopCount; i++) {
                const standardFile = isIndependent && standardFiles ? (standardFiles[i] || null) : (standardFiles ? standardFiles[0] : null);

                const files = {
                    standard: standardFile,
                    expanded: values.expandedLogoFile
                };
                
                let existingLogoQuery;

                if (isIndependent) {
                     existingLogoQuery = query(
                        collection(firestore, 'party_logos'),
                        where('partyId', '==', party.id),
                        where('electionId', '==', electionId),
                    );
                } else {
                     existingLogoQuery = query(
                        collection(firestore, 'party_logos'),
                        where('partyId', '==', party.id),
                        where('electionId', '==', electionId)
                    );
                }
                
                const existingLogoSnap = await getDocs(existingLogoQuery);
                const existingLogoDoc = isIndependent ? existingLogoSnap.docs[i] : existingLogoSnap.docs[0];

                let standardUrl = existingLogoDoc?.data()?.logoUrl;
                let expandedUrl = existingLogoDoc?.data()?.expandedLogoUrl;

                if (files.standard) {
                    if (standardUrl) await deleteFile(standardUrl).catch(console.warn);
                    const path = `logos/${party.id}_${electionId}_std_${isIndependent ? i : '0'}.png`;
                    standardUrl = await uploadFile(files.standard, path);
                }
                if (files.expanded) {
                    if (expandedUrl) await deleteFile(expandedUrl).catch(console.warn);
                     const path = `logos/${party.id}_${electionId}_exp_${isIndependent ? i : '0'}.png`;
                    expandedUrl = await uploadFile(files.expanded, path);
                }

                const dataToSave = {
                    partyId: party.id,
                    electionId,
                    logoUrl: standardUrl || '',
                    expandedLogoUrl: expandedUrl || '',
                };

                // Skip saving if there's no logo to save and it's not a multi-file independent upload context
                if (!dataToSave.logoUrl && !dataToSave.expandedLogoUrl && !isIndependent) {
                  continue;
                }

                if (existingLogoDoc) {
                    const docRef = doc(firestore, 'party_logos', existingLogoDoc.id);
                    batch.update(docRef, dataToSave);
                } else {
                    const newDocRef = doc(collection(firestore, 'party_logos'));
                    batch.set(newDocRef, dataToSave);
                }
            }
        }
        
        await batch.commit().catch(error => {
            const permissionError = new FirestorePermissionError({
                path: 'party_logos',
                operation: 'write',
                requestResourceData: values,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw error;
        });

        toast({ title: 'Upload Successful', description: 'Logos have been processed.' });
        onSuccess();
        form.reset();
        onClose();

    } catch (error) {
        console.error("Upload failed", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'An unexpected error occurred during upload. Please check the console.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

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
                            >
                                <CommandInput placeholder="Search elections..." />
                                <ScrollArea className="h-48">
                                  <CommandGroup>
                                  {electionOptions.map((option) => (
                                      <CommandItem
                                          key={option.value}
                                          onSelect={() => {
                                              const newValue = field.value.includes(option.value)
                                              ? field.value.filter((v) => v !== option.value)
                                              : [...field.value, option.value];
                                              field.onChange(newValue);
                                          }}
                                          className="flex items-center justify-between"
                                          >
                                          <span>{option.label}</span>
                                          <Check
                                              className={cn(
                                              'h-4 w-4',
                                              field.value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                                              )}
                                          />
                                      </CommandItem>
                                  ))}
                                  </CommandGroup>
                                </ScrollArea>
                            </MultiSelect>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 {isIndependent ? (
                     <>
                        <FormField
                            control={form.control}
                            name="standardLogoFiles"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Standard Logos (Square)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/png, image/jpeg" multiple onChange={(e) => field.onChange(e.target.files)} />
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
                    </>
                 ) : (
                    <>
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
                    </>
                 )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Upload and Apply
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
