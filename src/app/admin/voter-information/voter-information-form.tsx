'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Trash2, PlusCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Switch } from '@/components/ui/switch';

const voterInfoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  items: z.array(
    z.object({
      text: z.string().min(1, "Item text cannot be empty."),
      isVisible: z.boolean().default(true),
    })
  ).min(1, "At least one item is required."),
  isVisible: z.boolean().default(true),
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
      items: [{ text: '', isVisible: true }],
      isVisible: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
          ...initialData,
          isVisible: initialData.isVisible !== false, // Default to true if undefined
      });
    } else {
        form.reset({ title: '', items: [{ text: '', isVisible: true }], isVisible: true });
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
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.text`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input placeholder={`Item ${index + 1}`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name={`items.${index}.isVisible`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
             <Button type="button" variant="outline" size="sm" onClick={() => append({ text: '', isVisible: true })} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>

        <FormField
            control={form.control}
            name="isVisible"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">Section Visible</FormLabel>
                    <FormDescription>
                    Control whether this entire section is shown to the public.
                    </FormDescription>
                </div>
                <FormControl>
                    <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    />
                </FormControl>
                </FormItem>
            )}
        />

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
