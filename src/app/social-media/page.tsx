
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import type { Post } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function SocialMediaPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const postsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'posts'), orderBy('order', 'desc')) : null, [firestore]);
  const { data: posts, isLoading: loadingPosts } = useCollection<Post>(postsQuery);

  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [dislikedPosts, setDislikedPosts] = useState<string[]>([]);

  useEffect(() => {
    const liked = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    setLikedPosts(liked);
    const disliked = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');
    setDislikedPosts(disliked);
  }, []);

  const handleLikePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!firestore || likedPosts.includes(postId)) return;

    const postRef = doc(firestore, 'posts', postId);
    await updateDoc(postRef, { likeCount: increment(1) });
    const newLiked = [...likedPosts, postId];
    setLikedPosts(newLiked);
    localStorage.setItem('likedPosts', JSON.stringify(newLiked));
    toast({ title: 'Post Liked!' });
  };

  const handleDislikePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!firestore || dislikedPosts.includes(postId)) return;

    const postRef = doc(firestore, 'posts', postId);
    await updateDoc(postRef, { dislikeCount: increment(1) });
    const newDisliked = [...dislikedPosts, postId];
    setDislikedPosts(newDisliked);
    localStorage.setItem('dislikedPosts', JSON.stringify(newDisliked));
    toast({ title: 'Post Disliked' });
  };

  const getFacebookEmbedUrl = (postUrl?: string, videoUrl?: string): { type: 'post' | 'video' | null; url: string } => {
    const url = videoUrl || postUrl;
    if (!url) return { type: null, url: '' };

    try {
      const urlObj = new URL(url);
      if (url.includes('facebook.com/share')) {
        return { type: 'post', url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500` };
      }
      if (videoUrl || urlObj.pathname.includes('/watch') || urlObj.pathname.includes('/reel') || urlObj.pathname.includes('/videos/') || urlObj.pathname.includes('/share/v/')) {
        return { type: 'video', url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560` };
      }
      return { type: 'post', url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500` };
    } catch (e) {
      console.error("Invalid URL for post", e);
      return { type: 'post', url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url || '')}&show_text=true&width=500` };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Social Media Feed"
        description="The latest posts and videos from candidates and parties."
      />
      <div className="mt-8">
        {loadingPosts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => {
              const embed = getFacebookEmbedUrl(post.postUrl, post.videoUrl);
              if (!embed.url) return null;

              const contentClass = embed.type === 'video' ? 'aspect-[9/16]' : 'aspect-square';

              return (
                <Card key={post.id} className="h-full flex flex-col">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">
                      <Link href={post.authorUrl} target="_blank" className="hover:underline">{post.authorName}</Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={cn("p-0 flex-grow relative w-full", contentClass)}>
                    <iframe
                      data-src={embed.url}
                      src={embed.url}
                      className="absolute top-0 left-0 w-full h-full"
                      style={{ border: 'none', overflow: 'hidden' }}
                      allowFullScreen={true}
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
                    </iframe>
                  </CardContent>
                  <CardFooter className="p-2 justify-end gap-2 mt-auto">
                    <Button variant={likedPosts.includes(post.id) ? "default" : "outline"} size="sm" onClick={(e) => handleLikePost(e, post.id)} disabled={likedPosts.includes(post.id)}>
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      {post.likeCount || 0}
                    </Button>
                    <Button variant={dislikedPosts.includes(post.id) ? "destructive" : "outline"} size="sm" onClick={(e) => handleDislikePost(e, post.id)} disabled={dislikedPosts.includes(post.id)}>
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      {post.dislikeCount || 0}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-16">No social media posts have been added yet.</p>
        )}
      </div>
    </div>
  );
}
