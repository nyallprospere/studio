'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import type { NewsArticle } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Rss, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
    const publishedDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date();

    const handleLike = async () => {
        if (!firestore) return;
        const articleRef = doc(firestore, 'news', article.id);
        await updateDoc(articleRef, {
            likeCount: increment(1)
        });
    };
    
    const handleShare = () => {
        if(navigator.share) {
            navigator.share({
                title: article.title,
                text: article.summary,
                url: window.location.href,
            }).catch(console.error);
        } else {
            toast({ title: "Share not supported", description: "Your browser does not support the Web Share API."});
        }
    }

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
                 {article.imageUrl && (
                    <div className="w-full h-48 relative flex-shrink-0">
                       <Image src={article.imageUrl} alt={article.title} fill className="object-cover" />
                    </div>
                )}
                <div className="p-6 flex flex-col flex-grow">
                    <p className="text-sm text-muted-foreground">{format(publishedDate, 'PPP')}</p>
                    <h3 className="text-xl font-bold font-headline mt-1">{article.title}</h3>
                    <p className="text-muted-foreground mt-2 flex-grow">{article.summary}</p>
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">{article.source}</p>
                        <Link href={article.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                            Read More <Rss className="inline h-4 w-4" />
                        </Link>
                    </div>
                </div>
                <div className="border-t p-2 flex justify-around items-center bg-muted/50">
                    <Button variant="ghost" size="sm" onClick={handleLike}>
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Like ({article.likeCount || 0})
                    </Button>
                     <Button variant="ghost" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Comment
                    </Button>
                     <Button variant="ghost" size="sm" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                    </Button>
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
