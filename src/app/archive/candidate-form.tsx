
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect } from 'react';
import type { ArchivedCandidate, Party, Constituency } from '@/lib/types';

const candidateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  partyId: z.string().min(1, "Party is required"),
  constituencyId: z.string().min(1, "Constituency is required"),
  bio: z.string().optional(),
  photoFile: z.any().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isIncumbent: z.boolean().default(false),
  isPartyLeader: z.boolean().default(false),
  isDeputyLeader: z.boolean().default(false),
  partyLevel: z.enum(['higher', 'lower']).default('lower'),
});

type CandidateFormProps = {
  onSubmit: (data: z.infer<typeof candidateSchema>) => void;
  initialData?: ArchivedCandidate | null;
  onCancel: () => void;
  parties: Party[];
  constituencies: Constituency[];
};

export function CandidateForm({ onSubmit, initialData, onCancel, parties, constituencies }: CandidateFormProps) {
  const form = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      partyId: '',
      constituencyId: '',
      bio: '',
      imageUrl: '',
      isIncumbent: false,
      isPartyLeader: false,
      isDeputyLeader: false,
      partyLevel: 'lower',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        partyId: initialData.partyId,
        constituencyId: initialData.constituencyId,
        isIncumbent: initialData.isIncumbent ?? false,
        isPartyLeader: initialData.isPartyLeader ?? false,
        isDeputyLeader: initialData.isDeputyLeader ?? false,
        partyLevel: initialData.partyLevel ?? 'lower',
      });
    }
  }, [initialData, form]);

  const handleFormSubmit = (values: z.infer<typeof candidateSchema>) => {
    onSubmit(values);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Philip" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., J. Pierre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="partyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Political Party</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a party" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parties.map(party => (
                      <SelectItem key={party.id} value={party.id}>{party.name} ({party.acronym})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="constituencyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Constituency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a constituency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {constituencies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meet the Candidate</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief biography of the candidate..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="photoFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Candidate Photo</FormLabel>
              <FormControl>
                  <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
              </FormControl>
              <FormDescription>Upload a new PNG or JPG file to replace the current one. A square image works best.</FormDescription>
              {initialData?.imageUrl && <a href={initialData.imageUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current photo</a>}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex items-start gap-6">
          <FormField
            control={form.control}
            name="isIncumbent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Incumbent
                  </FormLabel>
                   <FormDescription>
                    Was this candidate holding office at the time?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="isPartyLeader"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Party Leader
                  </FormLabel>
                  <FormDescription>
                    Was this candidate the leader of their party?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="isDeputyLeader"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Deputy Leader
                  </FormLabel>
                  <FormDescription>
                    Was this candidate a deputy leader of their party?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>
        
        <FormField
            control={form.control}
            name="partyLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Party Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="higher">Higher</SelectItem>
                    <SelectItem value="lower">Lower</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                    Higher level candidates appear first in the list on the public candidates page.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Update Candidate</Button>
        </div>
      </form>
    </Form>
  );
}
