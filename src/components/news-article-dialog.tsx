
'use client';

import { useState, useMemo } from 'react';
import type { NewsArticle } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { format } from 'date-fns';
import { Timestamp, collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc, increment, getDocs, where, deleteDoc } from 'firebase/firestore';
import { Calendar, User, Rss, ThumbsUp, MessageSquare, Share2, Twitter, Facebook, Send, MoreVertical, Flag } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Comment {
    id: string;
    author: string;
    text: string;
    createdAt: Timestamp;
    likeCount?: number;
    replyTo?: string;
}

const commentSchema = z.object({
    comment: z.string().min(1, "Comment cannot be empty."),
    author: z.string().min(1, "Name is required."),
});


function CommentSection({ articleId }: { articleId: string }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const commentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'news', articleId, 'comments'), orderBy('createdAt', 'asc')) : null, [firestore, articleId]);
    const { data: comments } = useCollection<Comment>(commentsQuery);
    
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const form = useForm<z.infer<typeof commentSchema>>({
        resolver: zodResolver(commentSchema),
        defaultValues: { comment: '', author: '' },
    });

    const onSubmit = async (values: z.infer<typeof commentSchema>) => {
        if (!firestore) return;
        
        await addDoc(collection(firestore, 'news', articleId, 'comments'), {
            author: values.author,
            text: values.comment,
            createdAt: serverTimestamp(),
            likeCount: 0,
            replyTo: replyingTo,
        });

        form.reset();
        setReplyingTo(null);
    };

    const handleLike = async (commentId: string) => {
        if (!firestore) return;
        const commentRef = doc(firestore, 'news', articleId, 'comments', commentId);
        await updateDoc(commentRef, {
            likeCount: increment(1)
        });
    }

    const handleReport = async (comment: Comment) => {
        if (!firestore) return;
        
        await addDoc(collection(firestore, 'reports'), {
            articleId,
            commentId: comment.id,
            commentText: comment.text,
            commentAuthor: comment.author,
            reportedAt: serverTimestamp(),
            status: 'pending'
        });

        toast({ title: 'Comment Reported', description: 'Thank you for your feedback. A moderator will review this comment.' });
    }

    const commentsByParent = useMemo(() => {
        const topLevelComments: Comment[] = [];
        const replies: Record<string, Comment[]> = {};

        comments?.forEach(comment => {
            if (comment.replyTo) {
                if (!replies[comment.replyTo]) {
                    replies[comment.replyTo] = [];
                }
                replies[comment.replyTo].push(comment);
            } else {
                topLevelComments.push(comment);
            }
        });
        
        return { topLevelComments, replies };
    }, [comments]);


    return (
        <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4 px-1">Comments</h3>
            <ScrollArea className="flex-grow pr-4 -mr-4">
                <div className="space-y-4">
                    {commentsByParent.topLevelComments && commentsByParent.topLevelComments.length > 0 ? (
                        commentsByParent.topLevelComments.map(comment => (
                            <div key={comment.id}>
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{(comment.author || 'A').charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-muted rounded-lg p-3 flex-1">
                                        <p className="text-sm font-semibold">{comment.author}</p>
                                        <p className="text-sm text-muted-foreground">{comment.text}</p>
                                         <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                            <Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => handleLike(comment.id)}>Like</Button>
                                            <span>&bull;</span>
                                            <Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => setReplyingTo(comment.id)}>Reply</Button>
                                            <span>&bull;</span>
                                             <span>{comment.likeCount || 0} likes</span>
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto"><MoreVertical className="h-3 w-3"/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleReport(comment)}><Flag className="mr-2 h-4 w-4"/>Report</DropdownMenuItem>
                                                </DropdownMenuContent>
                                             </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                                {commentsByParent.replies[comment.id] && (
                                    <div className="ml-8 mt-2 space-y-2 border-l-2 pl-4">
                                        {commentsByParent.replies[comment.id].map(reply => (
                                             <div key={reply.id} className="flex items-start gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>{(reply.author || 'A').charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="bg-muted rounded-lg p-3 flex-1">
                                                    <p className="text-sm font-semibold">{reply.author}</p>
                                                    <p className="text-sm text-muted-foreground">{reply.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {replyingTo === comment.id && (
                                     <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2 mt-2 ml-8">
                                            <FormField control={form.control} name="author" render={({ field }) => (
                                                <FormItem className="flex-grow"><FormControl><Input placeholder="Your name..." {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="comment" render={({ field }) => (
                                                <FormItem className="flex-grow"><FormControl><Input placeholder="Write a reply..." {...field} autoFocus /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
                                        </form>
                                    </Form>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Be the first to comment!</p>
                    )}
                </div>
            </ScrollArea>
            {!replyingTo && (
                <div className="mt-4 pt-4 border-t">
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                             <FormField control={form.control} name="author" render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="Your name..." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="comment" render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="Write a comment..." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="flex justify-end">
                                <Button type="submit" size="sm">Post Comment</Button>
                            </div>
                        </form>
                    </Form>
                </div>
            )}
        </div>
    )
}

interface NewsArticleDialogProps {
  article: NewsArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

export function NewsArticleDialog({ article, isOpen, onClose }: NewsArticleDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(article?.likeCount || 0);

    useEffect(() => {
        if (!article) return;
        const likedArticles = JSON.parse(localStorage.getItem('likedNewsArticles') || '[]');
        if (likedArticles.includes(article.id)) {
            setIsLiked(true);
        }
         setLikeCount(article.likeCount || 0);
    }, [article]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!firestore || !article || isLiked) return;

        const articleRef = doc(firestore, 'news', article.id);
        await updateDoc(articleRef, {
            likeCount: increment(1)
        });

        const likedArticles = JSON.parse(localStorage.getItem('likedNewsArticles') || '[]');
        likedArticles.push(article.id);
        localStorage.setItem('likedNewsArticles', JSON.stringify(likedArticles));

        setIsLiked(true);
        setLikeCount(prev => prev + 1);

        toast({ title: "Article Liked!" });
    };

    if (!article) {
        return null;
    }

    const articleDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date();
    
    const articleUrl = article.url || (typeof window !== 'undefined' ? window.location.href : '');
    const shareText = `Check out this article: ${article.title}`;
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(articleUrl)}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col sm:flex-row gap-0 p-0">
                <div className="w-full sm:w-2/3 h-full flex flex-col">
                    <ScrollArea className="flex-grow">
                        <div className="p-6">
                            {article.imageUrl && (
                                <div className="relative h-64 w-full mb-4 rounded-lg overflow-hidden">
                                <Image src={article.imageUrl} alt={article.title} fill className="object-cover" />
                                </div>
                            )}
                            <DialogHeader className="text-left">
                                <DialogTitle className="font-headline text-3xl leading-tight">{article.title}</DialogTitle>
                                <div className="space-y-2 pt-2 text-md text-muted-foreground">
                                     <div className="flex items-center gap-2">
                                        <Rss className="h-4 w-4" />
                                        <span>{article.source}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{format(articleDate, "EEEE, MMMM do, yyyy")}</span>
                                    </div>
                                    {article.author && (
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            <span>{article.author}</span>
                                        </div>
                                    )}
                                </div>
                            </DialogHeader>
                            {article.content && (
                                <div className="mt-6">
                                    <p className="whitespace-pre-line text-foreground text-sm">{article.content}</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                     <DialogFooter className="p-4 border-t mt-auto">
                        <Button variant="ghost" size="sm" onClick={handleLike} disabled={isLiked}>
                            <ThumbsUp className="mr-2 h-4 w-4" /> 
                            Like ({likeCount})
                        </Button>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
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
                    </DialogFooter>
                </div>
                <div className="w-full sm:w-1/3 h-full border-l p-4 flex flex-col">
                   <CommentSection articleId={article.id} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
