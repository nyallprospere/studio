
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { SiteSettings } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Share2 } from 'lucide-react';

const shareSettingsSchema = z.object({
  defaultShareTitle: z.string().min(1, 'Title is required'),
  defaultShareDescription: z.string().min(1, 'Description is required'),
});

function SharePreview({ title, description }: { title: string; description: string }) {
    const victoryStatus = "SLP Wins a Decisive Victory"; // Example status
    const seatCount = "SLP 14, UWP 3"; // Example seat count
    const dynamicTitle = `I predict ${victoryStatus}`;
    const dynamicDescription = `${description} My prediction: ${seatCount}. Click here to make your own!`;

    return (
        <div className="mt-6 border p-4 rounded-lg space-y-2 bg-muted/50">
            <h4 className="text-sm font-semibold">Share Preview</h4>
            <div className="border rounded-lg bg-background overflow-hidden">
                <div className="relative aspect-video bg-gray-200">
                    <Image
                        src="https://storage.googleapis.com/proud-booth-422319-e7.appspot.com/maps/share-map-preview.png"
                        alt="Map preview"
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">lucianvotes.com</p>
                    <p className="text-sm font-bold">{dynamicTitle}</p>
                    <p className="text-xs text-muted-foreground">{dynamicDescription}</p>
                </div>
            </div>
        </div>
    )
}

export default function SocialSharingSettingsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const siteSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
    const { data: siteSettings, isLoading: loadingSiteSettings } = useDoc<SiteSettings>(siteSettingsRef);

    const form = useForm<z.infer<typeof shareSettingsSchema>>({
        resolver: zodResolver(shareSettingsSchema),
        defaultValues: {
            defaultShareTitle: '',
            defaultShareDescription: '',
        },
    });
    
    const watchedTitle = form.watch('defaultShareTitle');
    const watchedDescription = form.watch('defaultShareDescription');

    useEffect(() => {
        if (siteSettings) {
            form.reset({
                defaultShareTitle: siteSettings.defaultShareTitle || '',
                defaultShareDescription: siteSettings.defaultShareDescription || '',
            });
        }
    }, [siteSettings, form]);

    const handleShareSettingsSubmit = async (values: z.infer<typeof shareSettingsSchema>) => {
        if (!firestore || !siteSettingsRef) return;
        try {
            await setDoc(siteSettingsRef, values, { merge: true });
            toast({ title: 'Settings Updated', description: 'Default share settings have been saved.' });
        } catch (error) {
            console.error('Error saving share settings:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save share settings.' });
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <PageHeader
                title="Social Sharing Settings"
                description="Set the default text for social media posts when users share their maps."
            />
            <div className="mt-8 max-w-2xl mx-auto">
                 <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" /> Social Sharing
                    </CardTitle>
                    <CardDescription>
                        Set the default text for social media posts when users share their maps.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingSiteSettings ? <p>Loading...</p> : (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleShareSettingsSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="defaultShareTitle"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Default Share Title</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="defaultShareDescription"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Default Share Description</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit">Save Share Settings</Button>
                                </form>
                            </Form>
                        )}
                        <SharePreview title={watchedTitle} description={watchedDescription} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
