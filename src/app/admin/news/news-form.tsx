
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useState, useMemo, useEffect } from 'react';
import type { NewsArticle } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { summarizeArticle } from '@/lib/actions';
import { MultiSelect } from '@/components/multi-select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useUser } from '@/firebase';

const PREDEFINED_TAGS = [
  'SLP',
  'UWP',
  'Allen Chastanet',
  'Philip J Pierre',
  'Ernest Hilaire',
];

const newsArticleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().min(1, 'Summary is required'),
  content: z.string().optional(),
  url: z.string().url('A valid URL is required'),
  source: z.string().min(1, 'Source is required'),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mainImageFile: z.any().optional(),
  galleryImageFiles: z.any().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  galleryImageUrls: z.array(z.string().url()).optional(),
  publishedAt: z.date().optional(),
  articleDate: z.date().optional(),
});


type NewsFormProps = {
  onSubmit: (data: z.infer<typeof newsArticleSchema>) => void;
  initialData?: NewsArticle | null;
  onCancel: () => void;
};

export function NewsForm({ onSubmit, initialData, onCancel }: NewsFormProps) {
  const { user } = useUser();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  const form = useForm<z.infer<typeof newsArticleSchema>>({
    resolver: zodResolver(newsArticleSchema),
    defaultValues: {
      title: '',
      summary: '',
      content: '',
      source: '',
      url: '',
      author: '',
      tags: [],
      imageUrl: '',
      galleryImageUrls: [],
      publishedAt: new Date(),
      articleDate: new Date(),
    },
  });
  
  const currentTags = form.watch('tags') || [];

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        tags: initialData.tags || [],
        publishedAt: initialData.publishedAt ? (initialData.publishedAt as Timestamp).toDate() : new Date(),
        articleDate: initialData.articleDate ? (initialData.articleDate as Timestamp).toDate() : new Date(),
      });
    } else {
        form.reset({
            title: '',
            summary: '',
            content: '',
            source: '',
            url: '',
            author: '',
            tags: [],
            imageUrl: '',
            galleryImageUrls: [],
            publishedAt: new Date(),
            articleDate: new Date(),
        });
    }
  }, [initialData, form]);
  
  const handleGenerateSummary = async () => {
    const content = form.getValues('content');
    if (!content) {
      form.setError('content', { type: 'manual', message: 'Content is required to generate a summary.' });
      return;
    }
    setIsSummarizing(true);
    try {
        const result = await summarizeArticle(content);
        if (result.summary) {
            form.setValue('summary', result.summary);
        } else if (result.error) {
             form.setError('summary', { type: 'manual', message: result.error });
        } else {
            form.setError('summary', { type: 'manual', message: 'Could not generate summary.' });
        }
    } catch (e) {
        form.setError('summary', { type: 'manual', message: 'Failed to generate summary.' });
    }
    setIsSummarizing(false);
  }
  
  const allTagOptions = useMemo(() => {
    const combined = new Set([...PREDEFINED_TAGS, ...currentTags]);
    return Array.from(combined).map(tag => ({ value: tag, label: tag }));
  }, [currentTags]);

  const filteredTagOptions = useMemo(() => {
    if (!tagSearch) return allTagOptions;
    return allTagOptions.filter(option =>
      option.label.toLowerCase().includes(tagSearch.toLowerCase())
    );
  }, [tagSearch, allTagOptions]);


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
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea placeholder="The full content of the news article..." {...field} rows={10} />
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
               <div className="flex items-center justify-between">
                <FormLabel>Summary</FormLabel>
                {user && (
                    <Button type="button" size="sm" variant="outline" onClick={handleGenerateSummary} disabled={isSummarizing}>
                        {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        AI Summarize
                    </Button>
                )}
              </div>
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
                name="mainImageFile"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Main Article Image</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                    </FormControl>
                    {initialData?.imageUrl && (
                        <a href={initialData.imageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">View current image</a>
                    )}
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="galleryImageFiles"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Article Images (Gallery)</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" multiple onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                     <FormDescription>Upload one or more images for the gallery.</FormDescription>
                    {initialData?.galleryImageUrls && initialData.galleryImageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {initialData.galleryImageUrls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">View Gallery Image {i+1}</a>
                            ))}
                        </div>
                    )}
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
              <MultiSelect
                options={allTagOptions}
                selected={field.value || []}
                onChange={field.onChange}
                placeholder="Select or create tags..."
              >
                <CommandInput 
                    placeholder="Search or create tag..."
                    value={tagSearch}
                    onValueChange={setTagSearch}
                />
                <ScrollArea className="h-48">
                    <CommandEmpty>
                    {tagSearch && !filteredTagOptions.some(opt => opt.label.toLowerCase() === tagSearch.toLowerCase()) ? (
                        <CommandItem
                            onSelect={() => {
                                const newTag = tagSearch.trim();
                                if (newTag && !field.value?.includes(newTag)) {
                                    field.onChange([...(field.value || []), newTag]);
                                }
                                setTagSearch('');
                            }}
                        >
                            Create "{tagSearch}"
                        </CommandItem>
                        ) : 'No results found.'}
                    </CommandEmpty>
                  <CommandGroup>
                    {filteredTagOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                            const newValue = field.value?.includes(option.value)
                            ? field.value.filter((v) => v !== option.value)
                            : [...(field.value || []), option.value];
                            field.onChange(newValue);
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>{option.label}</span>
                        <Check
                          className={cn(
                            'h-4 w-4',
                            field.value?.includes(option.value)
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </MultiSelect>
              <FormMessage />
              {field.value && field.value.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {field.value.map(tag => (
                        <Badge key={tag} variant="secondary">
                            {tag}
                            <button
                                type="button"
                                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onClick={() => field.onChange(field.value?.filter(v => v !== tag))}
                            >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                        </Badge>
                    ))}
                </div>
              )}
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
