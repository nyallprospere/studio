
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useMemo } from 'react';
import type { ElectionResult, Election, Constituency } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

const resultSchema = z.object({
  electionId: z.string().min(1, "Election is required"),
  constituencyId: z.string().min(1, "Constituency is required"),
  uwpVotes: z.coerce.number().min(0, "Votes must be a positive number"),
  slpVotes: z.coerce.number().min(0, "Votes must be a positive number"),
  otherVotes: z.coerce.number().min(0, "Votes must be a positive number"),
});

type ResultFormProps = {
  onSubmit: (data: z.infer<typeof resultSchema>) => void;
  initialData?: ElectionResult | null;
  onCancel: () => void;
  elections: Election[];
  constituencies: Constituency[];
};

export function ResultForm({ onSubmit, initialData, onCancel, elections, constituencies }: ResultFormProps) {
  const form = useForm<z.infer<typeof resultSchema>>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      electionId: '',
      constituencyId: '',
      uwpVotes: 0,
      slpVotes: 0,
      otherVotes: 0,
    },
  });

  const watchAllFields = form.watch();

  const selectedConstituency = useMemo(() => {
    return constituencies.find(c => c.id === watchAllFields.constituencyId);
  }, [watchAllFields.constituencyId, constituencies]);

  const totalVotes = useMemo(() => {
    return (watchAllFields.slpVotes || 0) + (watchAllFields.uwpVotes || 0) + (watchAllFields.otherVotes || 0);
  }, [watchAllFields.slpVotes, watchAllFields.uwpVotes, watchAllFields.otherVotes]);

  const registeredVoters = useMemo(() => {
    return selectedConstituency?.demographics.registeredVoters || 0;
  }, [selectedConstituency]);

  const turnout = useMemo(() => {
    if (registeredVoters > 0) {
      return ((totalVotes / registeredVoters) * 100).toFixed(2);
    }
    return '0.00';
  }, [totalVotes, registeredVoters]);

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({
        electionId: '',
        constituencyId: '',
        uwpVotes: 0,
        slpVotes: 0,
        otherVotes: 0,
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
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
                control={form.control}
                name="slpVotes"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>SLP Votes</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="uwpVotes"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>UWP Votes</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="otherVotes"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Other Votes</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <Card className="bg-muted/50">
            <CardContent className="p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-sm text-muted-foreground">Registered Voters</p>
                    <p className="text-lg font-bold">{registeredVoters.toLocaleString()}</p>
                </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Total Votes</p>
                    <p className="text-lg font-bold">{totalVotes.toLocaleString()}</p>
                </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Turnout</p>
                    <p className="text-lg font-bold">{turnout}%</p>
                </div>
            </CardContent>
        </Card>

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
