'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect } from 'react';
import type { ElectionResult, Election, Party, Constituency } from '@/lib/types';

const resultSchema = z.object({
  electionId: z.string().min(1, "Election is required"),
  constituencyId: z.string().min(1, "Constituency is required"),
  partyId: z.string().min(1, "Party is required"),
  candidateName: z.string().min(1, "Candidate name is required"),
  votes: z.coerce.number().min(0, "Votes must be a positive number"),
  isWinner: z.boolean().default(false),
});

type ResultFormProps = {
  onSubmit: (data: z.infer<typeof resultSchema>) => void;
  initialData?: ElectionResult | null;
  onCancel: () => void;
  elections: Election[];
  parties: Party[];
  constituencies: Constituency[];
};

export function ResultForm({ onSubmit, initialData, onCancel, elections, parties, constituencies }: ResultFormProps) {
  const form = useForm<z.infer<typeof resultSchema>>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      electionId: '',
      constituencyId: '',
      partyId: '',
      candidateName: '',
      votes: 0,
      isWinner: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        isWinner: initialData.isWinner ?? false,
      });
    } else {
        form.reset({
          electionId: '',
          constituencyId: '',
          partyId: '',
          candidateName: '',
          votes: 0,
          isWinner: false,
        });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="electionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Election Year</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an election" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {elections.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a constituency" />
                    </Trigger>
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
          name="candidateName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Candidate Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="partyId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Political Party</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                name="votes"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Votes</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder="e.g., 5432" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        
        <FormField
            control={form.control}
            name="isWinner"
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
                    Winning Candidate
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Result' : 'Add Result'}</Button>
        </div>
      </form>
    </Form>
  );
}
