'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { NewsArticle } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Rss } from 'lucide-react';

function NewsCardSkeleton() {
    return (
        <Card className="flex flex-col md:flex-row gap-4 p-4">
            <Skeleton className="w-full md:w-1/3 h-48 rounded-md" />
            <div className="w-full md:w-2/3 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-24" />
            </div>
        </Card>
    );
}

function NewsCard({ article }: { article: NewsArticle }) {
    const publishedDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date();

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex flex-col md:flex-row">
                 {article.imageUrl && (
                    <div className="md:w-1/3 w-full h-48 md:h-auto relative flex-shrink-0">
                       <Image src={article.imageUrl} alt={article.title} fill className="object-cover" />
                    </div>
                )}
                <div className="p-6 flex flex-col">
                    <p className="text-sm text-muted-foreground">{format(publishedDate, 'PPP')}</p>
                    <h3 className="text-xl font-bold font-headline mt-1">{article.title}</h3>
                    <p className="text-muted-foreground mt-2 flex-grow">{article.summary}</p>
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">{article.source}</p>
                        <Link href={article.url} target="_blank" rel="noopener noreferrer">
                            <Rss className="h-4 w-4" />
                        </Link>
                    </div>
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
                <div className="space-y-6">
                    <NewsCardSkeleton />
                    <NewsCardSkeleton />
                </div>
            ) : (
                <div className="space-y-6">
                    {news && news.length > 0 ? (
                        news.map(article => <NewsCard key={article.id} article={article} />)
                    ) : (
                        <p className="text-center text-muted-foreground py-16">No news articles found.</p>
                    )}
                </div>
            )}
        </div>
    );
}
