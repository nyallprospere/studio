
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useMemo } from 'react';
import type { ElectionResult, Election, Constituency } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const resultSchema = z.object({
  electionId: z.string().min(1, "Election is required"),
  constituencyId: z.string().min(1, "Constituency is required"),
  uwpVotes: z.coerce.number().min(0, "Votes must be a positive number"),
  slpVotes: z.coerce.number().min(0, "Votes must be a positive number"),
  otherVotes: z.coerce.number().min(0, "Votes must be a positive number"),
  registeredVoters: z.coerce.number().min(0, "Registered voters must be a positive number"),
  votersNotAvailable: z.boolean().default(false),
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
      registeredVoters: 0,
      votersNotAvailable: false,
    },
  });

  const watchAllFields = form.watch();
  const votersNotAvailable = watchAllFields.votersNotAvailable;

  const selectedConstituency = useMemo(() => {
    return constituencies.find(c => c.id === watchAllFields.constituencyId);
  }, [watchAllFields.constituencyId, constituencies]);

  useEffect(() => {
    if (selectedConstituency && !form.getValues('registeredVoters') && !votersNotAvailable) {
        form.setValue('registeredVoters', selectedConstituency.demographics.registeredVoters || 0);
    }
    if (votersNotAvailable) {
        form.setValue('registeredVoters', 0);
    }
  }, [selectedConstituency, form, votersNotAvailable]);

  const totalVotes = useMemo(() => {
    return (watchAllFields.slpVotes || 0) + (watchAllFields.uwpVotes || 0) + (watchAllFields.otherVotes || 0);
  }, [watchAllFields.slpVotes, watchAllFields.uwpVotes, watchAllFields.otherVotes]);

  const registeredVoters = watchAllFields.registeredVoters;

  const turnout = useMemo(() => {
    if (votersNotAvailable || !registeredVoters || registeredVoters <= 0) {
        return 'N/A';
    }
    return ((totalVotes / registeredVoters) * 100).toFixed(2);
  }, [totalVotes, registeredVoters, votersNotAvailable]);

  useEffect(() => {
    if (initialData) {
      const isVotersNA = initialData.registeredVoters === 0;
      form.reset({
        ...initialData,
        registeredVoters: isVotersNA ? 0 : initialData.registeredVoters || selectedConstituency?.demographics.registeredVoters || 0,
        votersNotAvailable: isVotersNA
      });
    } else {
      const defaultRegisteredVoters = selectedConstituency?.demographics.registeredVoters || 0;
      form.reset({
        electionId: watchAllFields.electionId,
        constituencyId: watchAllFields.constituencyId,
        uwpVotes: 0,
        slpVotes: 0,
        otherVotes: 0,
        registeredVoters: votersNotAvailable ? 0 : defaultRegisteredVoters,
        votersNotAvailable: votersNotAvailable
      });
       if(watchAllFields.constituencyId && !votersNotAvailable) {
           form.setValue('registeredVoters', defaultRegisteredVoters);
       }
    }
  }, [initialData, form, selectedConstituency, watchAllFields.electionId, watchAllFields.constituencyId]);

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
                    <FormLabel>IND Votes</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <Card className="bg-muted/50">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <FormField
                    control={form.control}
                    name="registeredVoters"
                    render={({ field }) => (
                        <FormItem className="text-center">
                            <FormLabel className="text-sm text-muted-foreground">Registered Voters</FormLabel>
                            {votersNotAvailable ? (
                                <p className="text-lg font-bold">N/A</p>
                            ) : (
                               <FormControl>
                                <Input
                                    type="number"
                                    {...field}
                                    className="text-lg font-bold text-center bg-transparent border-0 border-b-2 rounded-none h-auto p-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary"
                                    disabled={votersNotAvailable}
                                />
                               </FormControl>
                            )}
                             <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Votes</p>
                    <p className="text-lg font-bold">{totalVotes.toLocaleString()}</p>
                </div>
                 <div className="text-center">
                    <p className="text-sm text-muted-foreground">Turnout</p>
                    <p className="text-lg font-bold">{turnout === 'N/A' ? 'N/A' : `${turnout}%`}</p>
                </div>
            </CardContent>
        </Card>
        
        <FormField
            control={form.control}
            name="votersNotAvailable"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Voters N/A</FormLabel>
                        <FormDescription>
                           Check if registered voter count is not available for this entry.
                        </FormDescription>
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
