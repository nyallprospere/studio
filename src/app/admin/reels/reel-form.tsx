
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect, useMemo } from 'react';
import type { Reel, Party, Candidate } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const reelSchema = z.object({
  authorUrl: z.string().url("A valid URL is required"),
  postUrl: z.string().url("A valid URL is required"),
  partyId: z.string().optional(),
  candidateId: z.string().optional(),
});

type ReelFormProps = {
  onSubmit: (data: z.infer<typeof reelSchema>) => void;
  initialData?: Reel | null;
  onCancel: () => void;
  parties: Party[];
  candidates: Candidate[];
};

export function ReelForm({ onSubmit, initialData, onCancel, parties, candidates }: ReelFormProps) {
  const form = useForm<z.infer<typeof reelSchema>>({
    resolver: zodResolver(reelSchema),
    defaultValues: {
      authorUrl: '',
      postUrl: '',
      partyId: '',
      candidateId: '',
    },
  });

  const selectedPartyId = form.watch('partyId');
  const selectedCandidateId = form.watch('candidateId');

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        candidateId: initialData.candidateId || 'none'
      });
    } else {
      form.reset({
        authorUrl: '',
        postUrl: '',
        partyId: '',
        candidateId: 'none',
      });
    }
  }, [initialData, form]);

  useEffect(() => {
    if (selectedCandidateId && selectedCandidateId !== 'none') {
      const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
      if (selectedCandidate && selectedCandidate.facebookUrl) {
        form.setValue('authorUrl', selectedCandidate.facebookUrl);
      }
    }
  }, [selectedCandidateId, candidates, form]);

  const filteredCandidates = useMemo(() => {
    if (!selectedPartyId || !candidates) return [];
    if (selectedPartyId === 'ind') {
      return candidates.filter(c => c.isIndependentCastriesCentral || c.isIndependentCastriesNorth);
    }
    return candidates.filter(c => c.partyId === selectedPartyId);
  }, [selectedPartyId, candidates]);

  const partyOptions = useMemo(() => {
    const mainParties = parties.filter(p => ['UWP', 'SLP'].includes(p.acronym));
    mainParties.push({ id: 'ind', name: 'Independent', acronym: 'IND' } as Party);
    mainParties.push({ id: 'none', name: 'None', acronym: 'None' } as Party);
    return mainParties;
  }, [parties]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="partyId"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Associated Party</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-wrap gap-4"
                >
                  {partyOptions.map(party => (
                    <FormItem key={party.id} className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={party.id === 'none' ? '' : party.id} id={party.id} />
                      </FormControl>
                      <FormLabel className="font-normal" htmlFor={party.id}>{party.name}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedPartyId && selectedPartyId !== 'none' && (
          <FormField
            control={form.control}
            name="candidateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Associated Candidate</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a candidate..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Candidate</SelectItem>
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map(candidate => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="nocandidates" disabled>No candidates found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="authorUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author Profile URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://www.facebook.com/username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="postUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reel Post URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://www.facebook.com/reel/12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Reel' : 'Add Reel'}</Button>
        </div>
      </form>
    </Form>
  );
}
