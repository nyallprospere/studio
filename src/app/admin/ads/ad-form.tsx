
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useMemo } from 'react';
import type { Ad } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/multi-select';
import { mainNavItems, adminNavItems } from '@/components/layout/sidebar-nav';
import { Command, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const adSchema = z.object({
  name: z.string().min(1, 'Ad name is required'),
  imageFile: z.any().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  url: z.string().url('A valid URL is required'),
  priority: z.enum(['high', 'medium', 'low']),
  pages: z.array(z.string()).min(1, 'Please select at least one page.'),
  position: z.enum(['top', 'bottom', 'both']),
  revenuePerClick: z.coerce.number().min(0, "Revenue must be a positive number").optional(),
  isActive: z.boolean().default(true),
}).refine(data => data.imageUrl || data.imageFile, {
  message: "An image is required. Please upload a file or provide a URL.",
  path: ["imageFile"],
});


type AdFormProps = {
  onSubmit: (data: z.infer<typeof adSchema>) => void;
  initialData?: Ad | null;
  onCancel: () => void;
};

export function AdForm({ onSubmit, initialData, onCancel }: AdFormProps) {
  const form = useForm<z.infer<typeof adSchema>>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      name: '',
      url: '',
      priority: 'medium',
      pages: [],
      position: 'top',
      isActive: true,
      imageUrl: '',
      revenuePerClick: 0,
    },
  });

  const pageOptions = useMemo(() => {
    return [...mainNavItems, ...adminNavItems.filter(item => !item.href.includes('ads'))].map(item => ({
        value: item.href,
        label: item.label
    })).sort((a,b) => a.label.localeCompare(b.label));
  }, []);

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData
      });
    } else {
        form.reset({
            name: '',
            url: '',
            priority: 'medium',
            pages: [],
            position: 'top',
            isActive: true,
            imageUrl: '',
            revenuePerClick: 0,
        });
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
              <FormLabel>Ad Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Summer Campaign Ad" {...field} />
              </FormControl>
               <FormDescription>A descriptive name for internal use.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Clickable URL</FormLabel>
              <FormControl>
                  <Input type="url" placeholder="https://example.com/promo" {...field} />
              </FormControl>
              <FormDescription>The destination URL when the ad is clicked.</FormDescription>
              <FormMessage />
              </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="imageFile"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ad Image</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                    </FormControl>
                    <FormDescription>Upload an image for the ad. Recommended size: 728x90 (leaderboard) or 300x250 (medium rectangle).</FormDescription>
                    {initialData?.imageUrl && <a href={initialData.imageUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current image</a>}
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="revenuePerClick"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Expected Revenue per Click ($)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0.50" {...field} step="0.01" />
                        </FormControl>
                        <FormDescription>The amount you expect to earn per click.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="high">High (30s)</SelectItem>
                        <SelectItem value="medium">Medium (20s)</SelectItem>
                        <SelectItem value="low">Low (10s)</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormDescription>High priority ads are shown more frequently.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="top">Top of Page</SelectItem>
                        <SelectItem value="bottom">Bottom of Page</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormDescription>Where on the page the ad should appear.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="pages"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Pages to Display On</FormLabel>
                    <MultiSelect
                        options={pageOptions}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Select pages..."
                    >
                         <CommandInput placeholder="Search pages..." />
                         <ScrollArea className="h-48">
                            <CommandGroup>
                                <CommandItem
                                    onSelect={() => {
                                        if (field.value.length === pageOptions.length) {
                                            field.onChange([]);
                                        } else {
                                            field.onChange(pageOptions.map(option => option.value));
                                        }
                                    }}
                                    className="flex items-center justify-between"
                                >
                                    <span>Select All</span>
                                    <Check
                                        className={cn(
                                        'h-4 w-4',
                                        field.value.length === pageOptions.length ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                </CommandItem>
                                {pageOptions.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    onSelect={() => {
                                        const newValue = field.value.includes(option.value)
                                        ? field.value.filter((v) => v !== option.value)
                                        : [...field.value, option.value];
                                        field.onChange(newValue);
                                    }}
                                    className="flex items-center justify-between"
                                    >
                                    <span>{option.label}</span>
                                    <Check
                                        className={cn(
                                        'h-4 w-4',
                                        field.value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                </CommandItem>
                                ))}
                            </CommandGroup>
                        </ScrollArea>
                    </MultiSelect>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">Activate Ad</FormLabel>
                    <FormDescription>
                    Use this switch to turn the ad on or off across the site.
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
          <Button type="submit">{initialData ? 'Update Ad' : 'Add Ad'}</Button>
        </div>
      </form>
    </Form>
  );
}
