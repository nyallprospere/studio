
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect, useMemo } from 'react';
import type { Region, Constituency } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const regionSchema = z.object({
  name: z.string().min(1, "Region name is required"),
  constituencyIds: z.array(z.string()).optional(),
});

type RegionFormProps = {
  onSubmit: (data: z.infer<typeof regionSchema>) => void;
  initialData?: Region | null;
  onCancel: () => void;
  allConstituencies: Constituency[];
  allRegions: Region[];
};

export function RegionForm({ onSubmit, initialData, onCancel, allConstituencies, allRegions }: RegionFormProps) {
  const form = useForm<z.infer<typeof regionSchema>>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: '',
      constituencyIds: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ 
        name: initialData.name,
        constituencyIds: initialData.constituencyIds || []
      });
    } else {
        form.reset({ name: '', constituencyIds: [] });
    }
  }, [initialData, form]);

  const availableConstituencies = useMemo(() => {
    const assignedIds = new Set(
        allRegions
            .filter(region => region.id !== initialData?.id)
            .flatMap(region => region.constituencyIds || [])
    );
    return allConstituencies.filter(c => !assignedIds.has(c.id));
  }, [allConstituencies, allRegions, initialData]);
  
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
        <FormField
          control={form.control}
          name="constituencyIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Constituencies</FormLabel>
              </div>
              <ScrollArea className="h-72 w-full rounded-md border p-4">
              {availableConstituencies.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="constituencyIds"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal w-full cursor-pointer">
                          {item.name}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              </ScrollArea>
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
