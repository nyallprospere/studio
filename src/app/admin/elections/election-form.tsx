'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect } from 'react';
import type { Election } from '@/lib/types';

const electionSchema = z.object({
  name: z.string().min(1, "Election name is required"),
  year: z.coerce.number().min(1900, "Invalid year").max(new Date().getFullYear() + 10, "Invalid year"),
  description: z.string().optional(),
});

type ElectionFormProps = {
  onSubmit: (data: z.infer<typeof electionSchema>) => void;
  initialData?: Election | null;
  onCancel: () => void;
};

export function ElectionForm({ onSubmit, initialData, onCancel }: ElectionFormProps) {
  const form = useForm<z.infer<typeof electionSchema>>({
    resolver: zodResolver(electionSchema),
    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
      description: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        name: initialData.name || `${initialData.year} General Election`,
      });
    } else {
        form.reset({
            name: '',
            year: new Date().getFullYear(),
            description: '',
        });
    }
  }, [initialData, form]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Election Year</FormLabel>
                <FormControl>
                <Input type="number" placeholder="e.g., 2026" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Election Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 2026 General Election" {...field} />
              </FormControl>
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
                <Textarea placeholder="A brief description of the election..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Election' : 'Add Election'}</Button>
        </div>
      </form>
    </Form>
  );
}
