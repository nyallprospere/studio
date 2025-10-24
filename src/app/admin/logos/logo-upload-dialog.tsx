
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
import type { Party, Election, Constituency, Candidate, PartyLogo } from '@/lib/types';
import { MultiSelect } from '@/components/multi-select';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, query, where, getDocs, updateDoc, addDoc, writeBatch, setDoc } from 'firebase/firestore';
import { uploadFile, deleteFile } from '@/firebase/storage';
import { Loader2 } from 'lucide-react';
import { Command, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LogoUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  elections: Election[];
  constituencies: Constituency[];
  onSuccess: () => void;
}

const uploadSchema = z.object({
  electionIds: z.array(z.string()).min(1, 'Please select at least one election.'),
  standardLogoFile: z.any().optional(),
  standardLogoFiles: z.any().optional(),
  expandedLogoFile: z.any().optional(),
  expandedLogoFiles: z.any().optional(),
  candidateName: z.string().optional(),
  constituencyIds: z.array(z.string()).optional(),
}).refine(data => {
    if(data.candidateName || (data.constituencyIds && data.constituencyIds.length > 0)) return true; // allow saving candidate info without logo
    return data.standardLogoFile || data.expandedLogoFile || (data.standardLogoFiles && data.standardLogoFiles.length > 0)
}, {
  message: 'At least one logo file is required.',
  path: ['standardLogoFile'],
});

export function LogoUploadDialog({ isOpen, onClose, party, elections, constituencies, onSuccess }: LogoUploadDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isIndependent = party?.id === 'independent';

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      electionIds: [],
      candidateName: '',
      constituencyIds: [],
    },
  });

  const electionOptions = elections.map(e => ({ 
    value: e.id, 
    label: e.name.replace(' General Election', '').replace('(April 6th)', '(Apr 6)').replace('(April 30th)', '(Apr 30)') 
  })).sort((a,b) => b.label.localeCompare(a.label));
  
  const constituencyOptions = constituencies.map(c => ({
    value: c.id,
    label: c.name,
  })).sort((a,b) => a.label.localeCompare(b.label));

  const handleFormSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (!firestore || !party) {
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        return;
    }

    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        
        if (isIndependent && values.constituencyIds && values.constituencyIds.length > 0) {
            const standardFiles = values.standardLogoFiles ? Array.from(values.standardLogoFiles) : [];
            const constituencyIds = values.constituencyIds;

            if (standardFiles.length > 1 && standardFiles.length !== constituencyIds.length) {
                toast({ variant: 'destructive', title: 'Mismatch', description: 'The number of standard logos must match the number of selected constituencies.' });
                setIsLoading(false);
                return;
            }

             for (const [index, constituencyId] of constituencyIds.entries()) {
                for (const electionId of values.electionIds) {
                    const logoData: Partial<PartyLogo> = {
                        partyId: 'independent',
                        electionId,
                        constituencyId: constituencyId,
                    }

                    const fileToUpload = standardFiles.length > 1 ? standardFiles[index] : standardFiles[0];

                    if (fileToUpload) {
                        const path = `logos/ind_${electionId}_${constituencyId}_std.png`;
                        logoData.logoUrl = await uploadFile(fileToUpload as File, path);
                    }
                    if (values.expandedLogoFile) { // Assuming one expanded logo for all
                        const path = `logos/ind_${electionId}_${constituencyId}_exp.png`;
                        logoData.expandedLogoUrl = await uploadFile(values.expandedLogoFile, path);
                    }

                    const q = query(
                        collection(firestore, 'party_logos'),
                        where('electionId', '==', electionId),
                        where('constituencyId', '==', constituencyId)
                    );
                    const existingLogoSnap = await getDocs(q);

                    if(!existingLogoSnap.empty) {
                        const docRef = existingLogoSnap.docs[0].ref;
                        const existingData = existingLogoSnap.docs[0].data();
                        if (logoData.logoUrl && existingData.logoUrl) await deleteFile(existingData.logoUrl);
                        if (logoData.expandedLogoUrl && existingData.expandedLogoUrl) await deleteFile(existingData.expandedLogoUrl);
                        
                        batch.update(docRef, logoData);
                    } else if (logoData.logoUrl || logoData.expandedLogoUrl) {
                        const newLogoRef = doc(collection(firestore, 'party_logos'));
                        batch.set(newLogoRef, logoData);
                    }
                }
            }
             toast({ title: 'Independent Logos Processed', description: 'Independent logos have been saved.' });

        } else {
            // Handle party logo uploads
            for (const electionId of values.electionIds) {
                const files = {
                    standard: values.standardLogoFile,
                    expanded: values.expandedLogoFile
                };
                
                const existingLogoQuery = query(
                    collection(firestore, 'party_logos'),
                    where('partyId', '==', party.id),
                    where('electionId', '==', electionId),
                );
                
                const existingLogoSnap = await getDocs(existingLogoQuery);
                const existingLogoDoc = existingLogoSnap.docs[0];

                let standardUrl = existingLogoDoc?.data()?.logoUrl;
                let expandedUrl = existingLogoDoc?.data()?.expandedLogoUrl;

                if (files.standard) {
                    if (standardUrl) await deleteFile(standardUrl).catch(console.warn);
                    const path = `logos/${party.id}_${electionId}_std.png`;
                    standardUrl = await uploadFile(files.standard, path);
                }
                if (files.expanded) {
                    if (expandedUrl) await deleteFile(expandedUrl).catch(console.warn);
                        const path = `logos/${party.id}_${electionId}_exp.png`;
                    expandedUrl = await uploadFile(files.expanded, path);
                }

                const dataToSave = {
                    partyId: party.id,
                    electionId,
                    logoUrl: standardUrl || '',
                    expandedLogoUrl: expandedUrl || '',
                };

                // Skip saving if there's no logo to save and it's not a multi-file independent upload context
                if (!dataToSave.logoUrl && !dataToSave.expandedLogoUrl) {
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
                toast({ title: 'Upload Successful', description: 'Logos have been processed.' });
        }
        
        await batch.commit().catch(error => {
            const permissionError = new FirestorePermissionError({
                path: 'party_logos',
                operation: 'write',
                requestResourceData: values,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

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
  
  const selectedConstituenciesCount = form.watch('constituencyIds')?.length || 0;

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
                            name="constituencyIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Constituencies</FormLabel>
                                     <MultiSelect
                                        options={constituencyOptions}
                                        selected={field.value || []}
                                        onChange={field.onChange}
                                        placeholder="Select constituencies..."
                                    >
                                        <CommandInput placeholder="Search constituencies..." />
                                        <ScrollArea className="h-48">
                                            <CommandGroup>
                                                {constituencyOptions.map((option) => (
                                                    <CommandItem
                                                        key={option.value}
                                                        onSelect={() => {
                                                            const newValue = field.value?.includes(option.value)
                                                            ? field.value.filter((v) => v !== option.value)
                                                            : [...(field.value || []), option.value];
                                                            field.onChange(newValue);
                                                        }}
                                                        className="flex items-center justify-between"
                                                        >
                                                        <span>{option.label}</span>
                                                        <Check
                                                            className={cn(
                                                            'h-4 w-4',
                                                            field.value?.includes(option.value) ? 'opacity-100' : 'opacity-0'
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </MultiSelect>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="standardLogoFiles"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Standard Logos</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/png, image/jpeg" multiple onChange={(e) => field.onChange(e.target.files)} />
                                    </FormControl>
                                    <FormMessage />
                                    <p className="text-xs text-muted-foreground">
                                        Upload a single file to apply to all, or multiple files that correspond to each selected constituency.
                                    </p>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="expandedLogoFile"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Expanded Logo (Banner) (Optional)</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/png, image/jpeg" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                                </FormControl>
                                 <FormMessage />
                                 <p className="text-xs text-muted-foreground">
                                    One expanded logo will be applied to all selected constituencies.
                                </p>
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
