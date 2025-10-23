'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useEffect } from 'react';
import type { NewsArticle } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';


const newsArticleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().min(1, 'Summary is required'),
  url: z.string().url('A valid URL is required'),
  source: z.string().min(1, 'Source is required'),
  author: z.string().optional(),
  tags: z.string().optional(),
  imageFile: z.any().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  publishedAt: z.date().optional(),
  articleDate: z.date().optional(),
});


type NewsFormProps = {
  onSubmit: (data: z.infer<typeof newsArticleSchema>) => void;
  initialData?: NewsArticle | null;
  onCancel: () => void;
};

export function NewsForm({ onSubmit, initialData, onCancel }: NewsFormProps) {
  const form = useForm<z.infer<typeof newsArticleSchema>>({
    resolver: zodResolver(newsArticleSchema),
    defaultValues: {
      title: '',
      summary: '',
      source: '',
      url: '',
      author: '',
      tags: '',
      imageUrl: '',
      publishedAt: new Date(),
      articleDate: new Date(),
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        tags: initialData.tags?.join(', '),
        publishedAt: initialData.publishedAt ? (initialData.publishedAt as Timestamp).toDate() : new Date(),
        articleDate: initialData.articleDate ? (initialData.articleDate as Timestamp).toDate() : new Date(),
      });
    } else {
        form.reset({
            title: '',
            summary: '',
            source: '',
            url: '',
            author: '',
            tags: '',
            imageUrl: '',
            publishedAt: new Date(),
            articleDate: new Date(),
        });
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
              <FormLabel>Article Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Government Announces New Economic Plan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief summary of the news article..." {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Article URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/news/article" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
                <FormItem>
                <FormLabel>News Source</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., The Voice" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="articleDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Article Date</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                            )}
                        >
                            {field.value ? (
                            format(field.value, "PPP")
                            ) : (
                            <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Author</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="imageFile"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Article Image</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                    </FormControl>
                    {initialData?.imageUrl && <a href={initialData.imageUrl} target="_blank" className="text-sm text-blue-500 hover:underline">View current image</a>}
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        {initialData && form.getValues('publishedAt') && (
            <FormItem>
                <FormLabel>Posted on LucianVotes</FormLabel>
                <p className="text-sm text-muted-foreground">{format(form.getValues('publishedAt') as Date, 'PPP')}</p>
            </FormItem>
        )}

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Politics, Economy, SLP" {...field} />
              </FormControl>
              <FormDescription>Comma-separated list of tags.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialData ? 'Update Article' : 'Add Article'}</Button>
        </div>
      </form>
    </Form>
  );
}
