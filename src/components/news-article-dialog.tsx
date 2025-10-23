
'use client';

import { useState, useMemo } from 'react';
import type { NewsArticle } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { format } from 'date-fns';
import { Timestamp, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Calendar, User, Rss, ThumbsUp, MessageSquare, Share2, Twitter, Facebook, Send } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Separator } from './ui/separator';

interface Comment {
    id: string;
    author: string;
    text: string;
    createdAt: Timestamp;
}

const commentSchema = z.object({
    comment: z.string().min(1, "Comment cannot be empty."),
});


function CommentSection({ articleId }: { articleId: string }) {
    const { firestore, user } = useFirebase();
    const commentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'news', articleId, 'comments'), orderBy('createdAt', 'asc')) : null, [firestore, articleId]);
    const { data: comments } = useCollection<Comment>(commentsQuery);

    const form = useForm<z.infer<typeof commentSchema>>({
        resolver: zodResolver(commentSchema),
        defaultValues: { comment: '' },
    });

    const onSubmit = async (values: z.infer<typeof commentSchema>) => {
        if (!firestore || !user) return;
        
        await addDoc(collection(firestore, 'news', articleId, 'comments'), {
            author: user.displayName || user.email || 'Anonymous',
            authorPhotoURL: user.photoURL,
            text: values.comment,
            createdAt: serverTimestamp(),
        });

        form.reset();
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4 px-1">Comments</h3>
            <ScrollArea className="flex-grow pr-4 -mr-4">
                <div className="space-y-4">
                    {comments && comments.length > 0 ? (
                        comments.map(comment => (
                            <div key={comment.id} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={(comment as any).authorPhotoURL} />
                                    <AvatarFallback>{(comment.author || 'A').charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-lg p-3 flex-1">
                                    <p className="text-sm font-semibold">{comment.author}</p>
                                    <p className="text-sm text-muted-foreground">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Be the first to comment!</p>
                    )}
                </div>
            </ScrollArea>
            {user && (
                <div className="mt-4 pt-4 border-t">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
                             <FormField
                                control={form.control}
                                name="comment"
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input placeholder="Write a comment..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" size="icon">
                                <Send className="h-4 w-4" />
                            </Button>
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
    if (!article) {
        return null;
    }

    const articleDate = article.articleDate?.toDate ? article.articleDate.toDate() : new Date();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-row gap-0 p-0">
                <div className="w-2/3 h-full">
                    <ScrollArea className="h-full pr-6">
                        <div className="p-6">
                            {article.imageUrl && (
                                <div className="relative h-64 w-full mb-4 rounded-lg overflow-hidden">
                                <Image src={article.imageUrl} alt={article.title} fill className="object-cover" />
                                </div>
                            )}
                            <DialogHeader className="text-left">
                                <DialogTitle className="font-headline text-3xl leading-tight">{article.title}</DialogTitle>
                                <DialogDescription className="space-y-2 pt-2 text-md">
                                     <div className="flex items-center gap-2">
                                        <Rss className="h-4 w-4 text-muted-foreground" />
                                        <span>{article.source}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>{format(articleDate, "EEEE, MMMM do, yyyy")}</span>
                                    </div>
                                    {article.author && (
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span>{article.author}</span>
                                        </div>
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            {article.content && (
                                <div className="mt-6">
                                    <p className="whitespace-pre-line text-foreground text-sm">{article.content}</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                <div className="w-1/3 h-full border-l p-4">
                   <CommentSection articleId={article.id} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
