
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import type { NewsArticle } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Rss, ThumbsUp, MessageSquare, Share2, Twitter, Facebook, User, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

function NewsCardSkeleton() {
    return (
        <Card className="flex flex-col md:flex-row gap-4 p-4">
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
        </Card>
    );
}

function NewsCard({ article }: { article: NewsArticle }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(article.likeCount || 0);

    useEffect(() => {
        // Check local storage to see if this article has been liked
        const likedArticles = JSON.parse(localStorage.getItem('likedNewsArticles') || '[]');
        if (likedArticles.includes(article.id)) {
            setIsLiked(true);
        }
    }, [article.id]);

    const handleLike = async () => {
        if (!firestore || isLiked) return;

        const articleRef = doc(firestore, 'news', article.id);
        await updateDoc(articleRef, {
            likeCount: increment(1)
        });

        // Store liked article in local storage
        const likedArticles = JSON.parse(localStorage.getItem('likedNewsArticles') || '[]');
        likedArticles.push(article.id);
        localStorage.setItem('likedNewsArticles', JSON.stringify(likedArticles));

        setIsLiked(true);
        setLikeCount(prev => prev + 1);

        toast({
            title: "Article Liked!",
        });
    };

    const handleShare = async () => {
        const shareData = {
            title: article.title,
            text: article.summary,
            url: article.url,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for browsers that don't support Web Share API
                // This will trigger the dropdown menu with links
                return;
            }
        } catch (err) {
            console.error('Share failed:', err);
        }
    };
    
    const articleDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date();

    const articleUrl = article.url || (typeof window !== 'undefined' ? window.location.href : '');
    const shareText = `Check out this article: ${article.title}`;
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(articleUrl)}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;

    const truncatedSummary = useMemo(() => {
        if (!article.summary) return '';
        const words = article.summary.split(' ');
        if (words.length > 20) {
            return words.slice(0, 20).join(' ') + '...';
        }
        return article.summary;
    }, [article.summary]);


    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col" id={article.id}>
            <div className="flex flex-col flex-grow">
                 {article.imageUrl && (
                    <div className="w-full h-48 relative flex-shrink-0">
                       <Image src={article.imageUrl} alt={article.title} fill className="object-cover" />
                    </div>
                )}
                <div className="p-6 flex flex-col flex-grow">
                    <p className="text-sm text-muted-foreground">{format(articleDate, 'PPP')}</p>
                    <h3 className="text-xl font-bold font-headline mt-1">{article.title}</h3>
                     {article.author && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            <span>{article.author}</span>
                        </div>
                     )}
                    <p className="text-muted-foreground mt-2 flex-grow">{truncatedSummary}</p>
                </div>
                <CardFooter className="p-4 bg-muted/50">
                    <div className="flex w-full justify-between items-center">
                        <div className="flex gap-4">
                            <Button variant="ghost" size="sm" onClick={handleLike} disabled={isLiked}>
                                <ThumbsUp className="mr-2 h-4 w-4" /> 
                                Like ({likeCount})
                            </Button>
                            <Button variant="ghost" size="sm">
                                <MessageSquare className="mr-2 h-4 w-4" /> 
                                Comment
                            </Button>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={handleShare}>
                                    <Share2 className="mr-2 h-4 w-4" /> 
                                    Share
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem asChild>
                                <Link href={twitterShareUrl} target="_blank" rel="noopener noreferrer">
                                    <Twitter className="mr-2 h-4 w-4" />
                                    Share on Twitter
                                </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                <Link href={facebookShareUrl} target="_blank" rel="noopener noreferrer">
                                    <Facebook className="mr-2 h-4 w-4" />
                                    Share on Facebook
                                </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardFooter>
            </div>
        </Card>
    )
}

export default function ElectionNewsPage() {
    const { firestore } = useFirebase();
    const newsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'news'), orderBy('articleDate', 'desc')) : null, [firestore]);
    const { data: news, isLoading } = useCollection<NewsArticle>(newsQuery);
    
    const [visibleCount, setVisibleCount] = useState(4);
    const [sortOption, setSortOption] = useState('trending');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [datePreset, setDatePreset] = useState('all');

    const handleDatePresetChange = (preset: string) => {
        setDatePreset(preset);
        const now = new Date();
        switch (preset) {
            case 'all':
                setDateRange(undefined);
                break;
            case 'day':
                setDateRange({ from: startOfDay(now), to: endOfDay(now) });
                break;
            case 'week':
                setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
                break;
            case 'month':
                setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
                break;
            case 'year':
                setDateRange({ from: startOfYear(now), to: endOfYear(now) });
                break;
            default:
                setDateRange(undefined);
        }
    }


    const filteredAndSortedNews = useMemo(() => {
        if (!news) return [];

        let processedNews = [...news];

        // Filter by date range
        if (dateRange?.from) {
            processedNews = processedNews.filter(article => {
                const articleDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date(0);
                return articleDate >= dateRange.from!;
            });
        }
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
             processedNews = processedNews.filter(article => {
                const articleDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date(0);
                return articleDate <= toDate;
            });
        }

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

    }, [news, sortOption, dateRange]);


    const visibleNews = useMemo(() => filteredAndSortedNews?.slice(0, visibleCount) || [], [filteredAndSortedNews, visibleCount]);

    const handleLoadMore = () => {
        setVisibleCount(prevCount => prevCount + 4);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-start mb-8">
                <PageHeader
                    title="Election News"
                    description="The latest news and analysis on the St. Lucian General Elections."
                />
                 <div className="flex flex-wrap items-center justify-end gap-2">
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
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[260px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Custom Range</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(range) => { setDateRange(range); setDatePreset('custom'); }}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
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

