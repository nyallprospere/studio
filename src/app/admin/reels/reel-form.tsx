
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect } from 'react';
import type { Reel } from '@/lib/types';

const reelSchema = z.object({
  authorName: z.string().min(1, "Author name is required"),
  authorUrl: z.string().url("A valid URL is required"),
  postUrl: z.string().url("A valid URL is required"),
});

type ReelFormProps = {
  onSubmit: (data: z.infer<typeof reelSchema>) => void;
  initialData?: Reel | null;
  onCancel: () => void;
};

export function ReelForm({ onSubmit, initialData, onCancel }: ReelFormProps) {
  const form = useForm<z.infer<typeof reelSchema>>({
    resolver: zodResolver(reelSchema),
    defaultValues: {
      authorName: '',
      authorUrl: '',
      postUrl: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({
        authorName: '',
        authorUrl: '',
        postUrl: '',
      });
    }
  }, [initialData, form]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="authorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Lucian reken" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
