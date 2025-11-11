'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy, where } from 'firebase/firestore';
import type { NewsArticle } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewsForm } from './news-form';
import Image from 'next/image';
import { Pencil, Trash2, PlusCircle, Rss, Tag, User, Calendar as CalendarIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { uploadFile, deleteFile } from '@/firebase/storage';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';


export default function AdminNewsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [date, setDate] = useState<DateRange | undefined>();
  const [datePreset, setDatePreset] = useState('all');

  const newsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'news'), orderBy('publishedAt', 'desc'));
    if (date?.from) {
        q = query(q, where('publishedAt', '>=', Timestamp.fromDate(date.from)));
    }
    if (date?.to) {
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999);
        q = query(q, where('publishedAt', '<=', Timestamp.fromDate(toDate)));
    }
    return q;
  }, [firestore, date]);
  
  const { data: news, isLoading, error } = useCollection<NewsArticle>(newsCollection);
  
  const handleDatePresetChange = (preset: string) => {
      setDatePreset(preset);
      const now = new Date();
      switch (preset) {
          case 'all':
              setDate(undefined);
              break;
          case 'day':
              setDate({ from: startOfDay(now), to: endOfDay(now) });
              break;
          case 'week':
              setDate({ from: startOfWeek(now), to: endOfWeek(now) });
              break;
          case 'month':
              setDate({ from: startOfMonth(now), to: endOfMonth(now) });
              break;
          case 'year':
              setDate({ from: startOfYear(now), to: endOfYear(now) });
              break;
          default:
              setDate(undefined);
      }
  }


  const handleFormSubmit = async (values: any) => {
    if (!firestore) return;
    
    try {
      let imageUrl = values.imageUrl || '';
      let galleryImageUrls = values.galleryImageUrls || [];

      // Handle main image upload
      if (values.mainImageFile) {
        if (editingArticle?.imageUrl) {
          await deleteFile(editingArticle.imageUrl).catch(console.warn);
        }
        const fileName = `${Date.now()}_${values.mainImageFile.name}`;
        imageUrl = await uploadFile(values.mainImageFile, `news/${fileName}_main`);
      }

      // Handle gallery images upload
      if (values.galleryImageFiles && values.galleryImageFiles.length > 0) {
          if (editingArticle?.galleryImageUrls) {
              for (const url of editingArticle.galleryImageUrls) {
                  await deleteFile(url).catch(console.warn);
              }
          }
          galleryImageUrls = await Promise.all(
              Array.from(values.galleryImageFiles).map((file: any) => {
                const fileName = `${Date.now()}_${file.name}`;
                return uploadFile(file, `news/gallery/${fileName}`);
              })
          );
      }

      const articleData = { 
        ...values, 
        imageUrl,
        galleryImageUrls,
        tags: values.tags || [],
        articleDate: values.articleDate ? Timestamp.fromDate(values.articleDate) : Timestamp.now(),
      };
      
      // Clean up file objects before saving to Firestore
      delete articleData.mainImageFile;
      delete articleData.galleryImageFiles;
      
      const newsColRef = collection(firestore, 'news');

      if (editingArticle) {
        // Don't update publishedAt when editing
        delete articleData.publishedAt;
        const articleDoc = doc(firestore, 'news', editingArticle.id);
        await updateDoc(articleDoc, articleData);
        toast({ title: "Article Updated", description: `The article "${articleData.title}" has been successfully updated.` });
      } else {
        articleData.publishedAt = Timestamp.now();
        await addDoc(newsColRef, articleData);
        toast({ title: "Article Added", description: `The article "${articleData.title}" has been successfully added.` });
      }
    } catch (e: any) {
        console.error("Error saving article:", e);
        toast({
            variant: 'destructive', 
            title: 'Save Failed', 
            description: e.message || 'Could not save the article. Please check the console for more details.'
        });
    } finally {
        setIsFormOpen(false);
        setEditingArticle(null);
    }
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setIsFormOpen(true);
  }

  const handleDelete = async (article: NewsArticle) => {
    if (!firestore) return;
    try {
      if (article.imageUrl) {
        await deleteFile(article.imageUrl).catch(console.warn);
      }
      if (article.galleryImageUrls) {
          for (const url of article.galleryImageUrls) {
              await deleteFile(url).catch(console.warn);
          }
      }
      const articleDoc = doc(firestore, 'news', article.id);
      await deleteDoc(articleDoc);
      toast({ title: "Article Deleted", description: `The article "${article.title}" has been deleted.` });
    } catch (error) {
      console.error("Error deleting article: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete article." });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage News"
          description="Create, edit, and manage news articles."
        />
         <div className="flex items-center gap-2">
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => { setEditingArticle(null); setIsFormOpen(true) }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Article
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl h-[90vh]">
                <DialogHeader>
                <DialogTitle>{editingArticle ? 'Edit Article' : 'Add New Article'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-full pr-6">
                    <NewsForm
                    onSubmit={handleFormSubmit}
                    initialData={editingArticle}
                    onCancel={() => setIsFormOpen(false)}
                    />
                </ScrollArea>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>News Articles</CardTitle>
                <CardDescription>A list of all news articles currently in the system.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                 <Select value={datePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading articles...</p>
            ) : error ? (
              <div className="text-red-600 bg-red-100 p-4 rounded-md">
                  <h3 className="font-bold">Error loading articles</h3>
                  <p>{error.message}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {news && news.length > 0 ? (
                  news.map((article) => (
                     <div key={article.id} className="flex items-start justify-between p-4 border rounded-md hover:bg-muted/50 gap-4">
                        {article.imageUrl && (
                            <Image src={article.imageUrl} alt={article.title} width={120} height={80} className="rounded-md object-cover border" />
                        )}
                        <div className="flex-grow">
                          <p className="font-semibold">{article.title}</p>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                <span>{article.source}</span>
                                <span>&bull;</span>
                                <span>{format(article.articleDate ? article.articleDate.toDate() : article.publishedAt.toDate(), 'PPP')}</span>
                                {article.author && (
                                    <>
                                        <span>&bull;</span>
                                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {article.author}</span>
                                    </>
                                )}
                            </div>
                          <p className="text-sm line-clamp-2 mt-1">{article.summary}</p>
                           {article.tags && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {article.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button asChild variant="ghost" size="icon">
                                <Link href={article.url} target="_blank" rel="noopener noreferrer">
                                    <Rss className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the article "{article.title}". This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(article)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No articles found for the selected date range.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
