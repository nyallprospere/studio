
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import type { NewsArticle } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
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
    const articleDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date();

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
                    <p className="text-muted-foreground mt-2 flex-grow">{article.summary}</p>
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
