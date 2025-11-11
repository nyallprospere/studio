
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { NewsArticle } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Rss, ThumbsUp, MessageSquare, Share2, Twitter, Facebook, User, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFirebase } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { NewsArticleDialog } from './news-article-dialog';

export function NewsCard({ article }: { article: NewsArticle }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(article.likeCount || 0);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        // Check local storage to see if this article has been liked
        const likedArticles = JSON.parse(localStorage.getItem('likedNewsArticles') || '[]');
        if (likedArticles.includes(article.id)) {
            setIsLiked(true);
        }
         setLikeCount(article.likeCount || 0);
    }, [article.id, article.likeCount]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!firestore || isLiked) return;

        const articleRef = doc(firestore, 'news', article.id);
        await updateDoc(articleRef, {
            likeCount: increment(1)
        });

        const likedArticles = JSON.parse(localStorage.getItem('likedNewsArticles') || '[]');
        likedArticles.push(article.id);
        localStorage.setItem('likedNewsArticles', JSON.stringify(likedArticles));

        setIsLiked(true);
        setLikeCount(prev => prev + 1);

        toast({
            title: "Article Liked!",
        });
    };
    
    const articleDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date();

    const articleUrl = article.url || (typeof window !== 'undefined' ? window.location.href : '');
    const shareText = `Check out this article: ${article.title}`;
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(articleUrl)}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
    const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + articleUrl)}`;

    const truncatedSummary = useMemo(() => {
        if (!article.summary) return '';
        const words = article.summary.split(' ');
        if (words.length > 20) {
            return words.slice(0, 20).join(' ') + '...';
        }
        return article.summary;
    }, [article.summary]);

    return (
        <>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col cursor-pointer" id={article.id} onClick={() => setIsDialogOpen(true)}>
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
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
                                    <MessageSquare className="mr-2 h-4 w-4" /> 
                                    Comment
                                </Button>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                        <Share2 className="mr-2 h-4 w-4" /> 
                                        Share
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
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
                                    <DropdownMenuItem asChild>
                                    <Link href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
                                        <Mail className="mr-2 h-4 w-4" />
                                        Share on WhatsApp
                                    </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardFooter>
                </div>
            </Card>
            <NewsArticleDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} article={article} />
        </>
    )
}
