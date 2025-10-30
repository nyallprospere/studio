'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Trash2, PlusCircle } from 'lucide-react';
import { useEffect } from 'react';

const voterInfoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  items: z.array(z.string().min(1, "Item text cannot be empty.")).min(1, "At least one item is required."),
});

export type VoterInformation = z.infer<typeof voterInfoSchema>;

type VoterInformationFormProps = {
  onSubmit: (data: VoterInformation) => void;
  initialData?: VoterInformation | null;
  onCancel: () => void;
};

export function VoterInformationForm({ onSubmit, initialData, onCancel }: VoterInformationFormProps) {
  const form = useForm<VoterInformation>({
    resolver: zodResolver(voterInfoSchema),
    defaultValues: {
      title: '',
      items: [''],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
        form.reset({ title: '', items: [''] });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Section Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Key Dates & Deadlines" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
            <FormLabel>Items</FormLabel>
            <div className="space-y-2 mt-2">
                {fields.map((field, index) => (
                    <FormField
                        key={field.id}
                        control={form.control}
                        name={`items.${index}`}
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center gap-2">
                                    <FormControl>
                                        <Input placeholder={`Item ${index + 1}`} {...field} />
                                    </FormControl>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
            </div>
             <Button type="button" variant="outline" size="sm" onClick={() => append('')} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>


        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Section' : 'Add Section'}</Button>
        </div>
      </form>
    </Form>
  );
}
