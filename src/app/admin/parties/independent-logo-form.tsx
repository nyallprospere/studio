
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useEffect } from 'react';
import type { Election } from '@/lib/types';

const logoSchema = z.object({
  independentLogoFile: z.any().optional(),
  independentLogoUrl: z.string().url().optional().or(z.literal('')),
  independentExpandedLogoFile: z.any().optional(),
  independentExpandedLogoUrl: z.string().url().optional().or(z.literal('')),
});

type IndependentLogoFormProps = {
  onSubmit: (data: z.infer<typeof logoSchema>) => void;
  initialData?: Election | null;
  onCancel: () => void;
};

export function IndependentLogoForm({ onSubmit, initialData, onCancel }: IndependentLogoFormProps) {
  const form = useForm<z.infer<typeof logoSchema>>({
    resolver: zodResolver(logoSchema),
    defaultValues: {
      independentLogoUrl: '',
      independentExpandedLogoUrl: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        independentLogoUrl: initialData.independentLogoUrl || '',
        independentExpandedLogoUrl: initialData.independentExpandedLogoUrl || '',
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="independentLogoFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Standard Logo</FormLabel>
              <FormControl>
                <Input type="file" accept="image/png, image/jpeg" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
              </FormControl>
              <FormDescription>Upload a PNG or JPG file for the standard independent logo.</FormDescription>
              {initialData?.independentLogoUrl && <a href={initialData.independentLogoUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current logo</a>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="independentExpandedLogoFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expanded Logo</FormLabel>
              <FormControl>
                <Input type="file" accept="image/png, image/jpeg" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
              </FormControl>
              <FormDescription>Upload a larger version of the logo.</FormDescription>
              {initialData?.independentExpandedLogoUrl && <a href={initialData.independentExpandedLogoUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current expanded logo</a>}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Update Logos</Button>
        </div>
      </form>
    </Form>
  );
}
