
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useState } from 'react';
import type { ArchivedCandidate, Party, Constituency } from '@/lib/types';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [isPartyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [isConstituencyPopoverOpen, setConstituencyPopoverOpen] = useState(false);

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
              <FormItem className="flex flex-col">
                <FormLabel>Political Party</FormLabel>
                 <Popover open={isPartyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? parties.find(
                              (party) => party.id === field.value
                            )?.name
                          : "Select a party"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <ScrollArea className="h-64">
                      <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                            setPartyPopoverOpen(false);
                        }}
                        value={field.value}
                        className="p-4"
                      >
                        {parties.map(party => (
                          <FormItem className="flex items-center space-x-3 space-y-0" key={party.id}>
                            <FormControl>
                              <RadioGroupItem value={party.id} />
                            </FormControl>
                            <FormLabel className="font-normal w-full cursor-pointer">
                              {party.name} ({party.acronym})
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="constituencyId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Constituency</FormLabel>
                <Popover open={isConstituencyPopoverOpen} onOpenChange={setConstituencyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? constituencies.find(
                              (c) => c.id === field.value
                            )?.name
                          : "Select a constituency"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <ScrollArea className="h-64">
                      <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                            setConstituencyPopoverOpen(false);
                        }}
                        value={field.value}
                        className="p-4"
                      >
                        {constituencies.map(c => (
                          <FormItem className="flex items-center space-x-3 space-y-0" key={c.id}>
                            <FormControl>
                              <RadioGroupItem value={c.id} />
                            </FormControl>
                            <FormLabel className="font-normal w-full cursor-pointer">
                              {c.name}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
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
