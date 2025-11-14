
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { NewsArticle } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
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
    
    const newsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'news'), orderBy('articleDate', 'desc'));
    }, [firestore]);
    
    const { data: news, isLoading } = useCollection<NewsArticle>(newsQuery);
    
    const [sortOption, setSortOption] = useState('newest');
    const [visibleMonths, setVisibleMonths] = useState(1);

    const newsByMonth = useMemo(() => {
        if (!news) return {};
        let processedNews = [...news];

        // Sort based on selection
        switch (sortOption) {
            case 'popular':
                processedNews.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
                break;
            case 'oldest':
                processedNews.sort((a, b) => (a.articleDate?.toDate() || 0).getTime() - (b.articleDate?.toDate() || 0).getTime());
                break;
            case 'newest':
            default:
                // Already sorted by newest from Firestore query
                break;
        }

        return processedNews.reduce((acc, article) => {
            const date = article.articleDate?.toDate();
            if (date) {
                const monthYear = format(date, 'MMMM yyyy');
                if (!acc[monthYear]) {
                    acc[monthYear] = [];
                }
                acc[monthYear].push(article);
            }
            return acc;
        }, {} as Record<string, NewsArticle[]>);
    }, [news, sortOption]);

    const monthKeys = useMemo(() => {
        // To maintain order, we get keys from the originally sorted `news` array
        if (!news) return [];
        const orderedKeys = news.reduce((acc, article) => {
             const date = article.articleDate?.toDate();
             if (date) {
                const monthYear = format(date, 'MMMM yyyy');
                if (!acc.includes(monthYear)) {
                    acc.push(monthYear);
                }
             }
             return acc;
        }, [] as string[]);

        if (sortOption === 'oldest') {
            return orderedKeys.reverse();
        }
        return orderedKeys;
    }, [news, sortOption]);

    const visibleMonthKeys = useMemo(() => monthKeys.slice(0, visibleMonths), [monthKeys, visibleMonths]);

    const handleLoadMore = () => {
        setVisibleMonths(prev => prev + 1);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
                <PageHeader
                    title="Election News"
                    description="The latest news and analysis on the St. Lucian General Elections."
                />
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading && visibleMonthKeys.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                </div>
            ) : (
                <div className="space-y-12">
                    {visibleMonthKeys.length > 0 ? (
                        visibleMonthKeys.map(month => (
                            <section key={month}>
                                <h2 className="text-2xl font-bold font-headline mb-6">{month}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {newsByMonth[month].map(article => (
                                        <NewsCard key={article.id} article={article} />
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-16 col-span-full">No news articles found.</p>
                    )}

                    {monthKeys && visibleMonths < monthKeys.length && (
                        <div className="flex justify-center mt-8">
                            <Button onClick={handleLoadMore}>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin hidden" />
                                Load More
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
