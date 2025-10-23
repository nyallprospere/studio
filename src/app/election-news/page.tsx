
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
import { format } from 'date-fns';
import { Rss, ThumbsUp, MessageSquare, Share2, Twitter, Facebook, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader
                title="Election News"
                description="The latest news and analysis on the St. Lucian General Elections."
            />
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {news && news.length > 0 ? (
                        news.map(article => <NewsCard key={article.id} article={article} />)
                    ) : (
                        <p className="text-center text-muted-foreground py-16 col-span-full">No news articles found.</p>
                    )}
                </div>
            )}
        </div>
    );
}
