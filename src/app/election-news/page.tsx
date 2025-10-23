
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import type { NewsArticle } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewsCard } from '@/components/news-card';

function NewsCardSkeleton() {
    return (
        <div className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg">
            <Skeleton className="w-full md:w-1/3 h-48 rounded-md" />
            <div className="w-full md:w-2/3 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-4 pt-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                </div>
            </div>
        </div>
    );
}


export default function ElectionNewsPage() {
    const { firestore } = useFirebase();
    const [datePreset, setDatePreset] = useState('all');
    
    const newsQuery = useMemoFirebase(() => {
        if (!firestore) return null;

        let q = query(collection(firestore, 'news'), orderBy('articleDate', 'desc'));

        const now = new Date();
        let fromDate: Date | null = null;
        let toDate: Date | null = endOfDay(now);

        switch (datePreset) {
            case 'day':
                fromDate = startOfDay(now);
                break;
            case 'week':
                fromDate = startOfWeek(now);
                break;
            case 'month':
                fromDate = startOfMonth(now);
                break;
            case 'year':
                fromDate = startOfYear(now);
                break;
            case 'all':
            default:
                // No date filter for 'all time'
                break;
        }
        
        if (fromDate) {
            q = query(q, where('articleDate', '>=', Timestamp.fromDate(fromDate)));
        }
         if (toDate && datePreset !== 'all') {
            q = query(q, where('articleDate', '<=', Timestamp.fromDate(toDate)));
        }


        return q;
    }, [firestore, datePreset]);
    
    const { data: news, isLoading } = useCollection<NewsArticle>(newsQuery);
    
    const [visibleCount, setVisibleCount] = useState(4);
    const [sortOption, setSortOption] = useState('trending');
    

    const filteredAndSortedNews = useMemo(() => {
        if (!news) return [];

        let processedNews = [...news];

        // Sort
        switch (sortOption) {
            case 'trending':
                 const oneWeekAgo = subDays(new Date(), 7);
                 processedNews.sort((a, b) => {
                    const scoreA = (a.articleDate?.toDate() > oneWeekAgo) ? (a.likeCount || 0) + 1 : 0;
                    const scoreB = (b.articleDate?.toDate() > oneWeekAgo) ? (b.likeCount || 0) + 1 : 0;
                    return scoreB - scoreA;
                });
                break;
            case 'popular':
                processedNews.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
                break;
            case 'newest':
                // Already sorted by newest from Firestore query
                break;
            case 'oldest':
                processedNews.reverse();
                break;
            case 'likes':
                 processedNews.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
                break;
        }

        return processedNews;

    }, [news, sortOption]);


    const visibleNews = useMemo(() => filteredAndSortedNews?.slice(0, visibleCount) || [], [filteredAndSortedNews, visibleCount]);

    const handleLoadMore = () => {
        setVisibleCount(prevCount => prevCount + 4);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
                <PageHeader
                    title="Election News"
                    description="The latest news and analysis on the St. Lucian General Elections."
                />
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Select value={datePreset} onValueChange={setDatePreset}>
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
                    <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="trending">Trending</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                        <SelectItem value="likes">Likes</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading && visibleNews.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {visibleNews.length > 0 ? (
                            visibleNews.map(article => <NewsCard key={article.id} article={article} />)
                        ) : (
                            <p className="text-center text-muted-foreground py-16 col-span-full">No news articles found for the selected criteria.</p>
                        )}
                    </div>
                    {filteredAndSortedNews && visibleCount < filteredAndSortedNews.length && (
                        <div className="flex justify-center mt-8">
                            <Button onClick={handleLoadMore}>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin hidden" />
                                Load More
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
