
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
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import type { Event, Party } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  partyId: z.string().min(1, "Party is required"),
  date: z.date({
    required_error: "A date is required.",
  }),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  photoFile: z.any().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

type EventFormProps = {
  onSubmit: (data: z.infer<typeof eventSchema>) => void;
  initialData?: Event | null;
  onCancel: () => void;
  parties: Party[];
  preselectedPartyId?: string;
};

export function EventForm({ onSubmit, initialData, onCancel, parties, preselectedPartyId }: EventFormProps) {
  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      partyId: preselectedPartyId || '',
      location: '',
      description: '',
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      const eventDate = (initialData.date as unknown as Timestamp)?.toDate ? (initialData.date as unknown as Timestamp).toDate() : new Date(initialData.date);
      form.reset({
        ...initialData,
        date: eventDate,
        partyId: initialData.partyId,
      });
    } else {
      form.reset({
        title: '',
        partyId: preselectedPartyId || '',
        location: '',
        description: '',
        date: undefined,
        imageUrl: '',
      });
    }
  }, [initialData, form, preselectedPartyId]);

  const partiesToShow = preselectedPartyId && !initialData
    ? parties.filter(p => p.id === preselectedPartyId)
    : parties;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Town Hall Meeting" {...field} />
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
                <FormLabel>Party</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a party" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partiesToShow.map(party => (
                      <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Event Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Castries Market Steps" {...field} />
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
              <FormLabel>Event Image</FormLabel>
              <FormControl>
                  <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
              </FormControl>
              <FormDescription>Upload a PNG or JPG file. A landscape image works best.</FormDescription>
              {initialData?.imageUrl && <a href={initialData.imageUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current image</a>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief description of the event..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Event' : 'Add Event'}</Button>
        </div>
      </form>
    </Form>
  );
}
