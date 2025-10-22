
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect } from 'react';
import type { Region } from '@/lib/types';

const regionSchema = z.object({
  name: z.string().min(1, "Region name is required"),
});

type RegionFormProps = {
  onSubmit: (data: z.infer<typeof regionSchema>) => void;
  initialData?: Region | null;
  onCancel: () => void;
};

export function RegionForm({ onSubmit, initialData, onCancel }: RegionFormProps) {
  const form = useForm<z.infer<typeof regionSchema>>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ name: initialData.name });
    } else {
        form.reset({ name: '' });
    }
  }, [initialData, form]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Region Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., North, South" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Region' : 'Add Region'}</Button>
        </div>
      </form>
    </Form>
  );
}
