
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useEffect } from 'react';
import type { Election, Party } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const leaderSchema = z.object({
  uwpLeader: z.string().optional(),
  uwpLeaderPhotoFile: z.any().optional(),
  uwpLeaderImageUrl: z.string().url().optional().or(z.literal('')),
  slpLeader: z.string().optional(),
  slpLeaderPhotoFile: z.any().optional(),
  slpLeaderImageUrl: z.string().url().optional().or(z.literal('')),
});

type LeaderFormProps = {
  onSubmit: (data: z.infer<typeof leaderSchema>) => void;
  initialData?: Election | null;
  onCancel: () => void;
  uwpParty?: Party;
  slpParty?: Party;
};

export function LeaderForm({ onSubmit, initialData, onCancel, uwpParty, slpParty }: LeaderFormProps) {
  const form = useForm<z.infer<typeof leaderSchema>>({
    resolver: zodResolver(leaderSchema),
    defaultValues: {
      uwpLeader: '',
      uwpLeaderImageUrl: '',
      slpLeader: '',
      slpLeaderImageUrl: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        uwpLeader: initialData.uwpLeader || '',
        uwpLeaderImageUrl: initialData.uwpLeaderImageUrl || '',
        slpLeader: initialData.slpLeader || '',
        slpLeaderImageUrl: initialData.slpLeaderImageUrl || '',
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle style={{color: uwpParty?.color}}>{uwpParty?.name} Leader</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="uwpLeader"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Leader's Name</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Allen Chastanet" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="uwpLeaderPhotoFile"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Leader's Photo</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                                </FormControl>
                                {initialData?.uwpLeaderImageUrl && <a href={initialData.uwpLeaderImageUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current photo</a>}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle style={{color: slpParty?.color}}>{slpParty?.name} Leader</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name="slpLeader"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Leader's Name</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Philip J. Pierre" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="slpLeaderPhotoFile"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Leader's Photo</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                                </FormControl>
                                {initialData?.slpLeaderImageUrl && <a href={initialData.slpLeaderImageUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current photo</a>}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Update Leaders</Button>
        </div>
      </form>
    </Form>
  );
}
