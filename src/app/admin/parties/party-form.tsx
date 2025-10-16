'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useEffect } from 'react';
import type { Party } from '@/lib/types';
import { Chrome, Palette, Link } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const partySchema = z.object({
  name: z.string().min(1, "Party name is required"),
  acronym: z.string().min(1, "Acronym is required"),
  leader: z.string().min(1, "Leader's name is required"),
  founded: z.coerce.number().min(1900, "Invalid year").max(new Date().getFullYear(), "Invalid year"),
  color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Invalid hex color"),
  website: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  description: z.string().optional(),
  manifestoSummary: z.string().optional(),
  logoFile: z.any().optional(),
  manifestoFile: z.any().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  manifestoUrl: z.string().url().optional().or(z.literal('')),
});

type PartyFormProps = {
  onSubmit: (data: z.infer<typeof partySchema>) => void;
  initialData?: Party | null;
  onCancel: () => void;
};

const colorSwatches = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB', '#1E88E5',
  '#039BE5', '#00ACC1', '#00897B', '#43A047', '#7CB342', '#C0CA33',
  '#FDD835', '#FFB300', '#FB8C00', '#F4511E', '#6D4C41', '#757575',
];


export function PartyForm({ onSubmit, initialData, onCancel }: PartyFormProps) {
  const form = useForm<z.infer<typeof partySchema>>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      acronym: '',
      leader: '',
      founded: new Date().getFullYear(),
      color: '#000000',
      website: '',
      description: '',
      manifestoSummary: '',
      logoUrl: '',
      manifestoUrl: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        founded: initialData.founded,
      });
    } else {
        form.reset({
            name: '',
            acronym: '',
            leader: '',
            founded: new Date().getFullYear(),
            color: '#6D4C41',
            website: '',
            description: '',
            manifestoSummary: '',
            logoUrl: '',
            manifestoUrl: '',
        });
    }
  }, [initialData, form]);

  const handleFormSubmit = (values: z.infer<typeof partySchema>) => {
    onSubmit(values);
  };
  
  const selectedColor = form.watch('color');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Party Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., United Workers Party" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="acronym"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Party Abbreviation</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., UWP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="leader"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Party Leader</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Allen Chastanet" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="founded"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Founding Year</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 1964" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Party Color</FormLabel>
                         <div className="flex items-center gap-2">
                             <FormControl>
                                <Input type="text" {...field} className="w-24"/>
                            </FormControl>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon">
                                        <Palette className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                     <div className="grid grid-cols-6 gap-1">
                                        {colorSwatches.map(color => (
                                            <button
                                                type="button"
                                                key={color}
                                                className="h-8 w-8 rounded-full border-2"
                                                style={{ backgroundColor: color, borderColor: selectedColor === color ? 'hsl(var(--primary))' : 'transparent' }}
                                                onClick={() => field.onChange(color)}
                                            />
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: field.value }}></div>
                         </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        </div>
        
        <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <div className="relative">
                     <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="https://example.com" {...field} className="pl-9" />
                  </div>
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
              <FormLabel>Party Summary/Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief summary of the party's history and platform..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="manifestoSummary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manifesto Summary</FormLabel>
              <FormControl>
                <Textarea placeholder="A short summary of the key points from the party's manifesto..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="logoFile"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Party Logo</FormLabel>
                <FormControl>
                    <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                </FormControl>
                <FormDescription>Upload a PNG, JPG, or SVG file.</FormDescription>
                {initialData?.logoUrl && <a href={initialData.logoUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current logo</a>}
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="manifestoFile"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Party Manifesto (PDF)</FormLabel>
                <FormControl>
                    <Input type="file" accept=".pdf" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                </FormControl>
                 <FormDescription>Upload a PDF document.</FormDescription>
                {initialData?.manifestoUrl && <a href={initialData.manifestoUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current manifesto</a>}
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Party' : 'Add Party'}</Button>
        </div>
      </form>
    </Form>
  );
}
