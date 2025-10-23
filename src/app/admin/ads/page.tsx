
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, CollectionReference, Timestamp } from 'firebase/firestore';
import type { Ad } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdForm } from './ad-form';
import Image from 'next/image';
import { Pencil, Trash2, PlusCircle, CheckCircle, XCircle, CalendarIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { uploadFile, deleteFile } from '@/firebase/storage';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

function AdItem({ ad, onEdit, onDelete }: { ad: Ad; onEdit: (ad: Ad) => void; onDelete: (ad: Ad) => void; }) {
  const priorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return null;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
      <div className="flex items-center gap-4">
        <Image src={ad.imageUrl} alt={ad.name} width={120} height={60} className="rounded-md object-contain border" />
        <div>
          <p className="font-semibold">{ad.name}</p>
          <a href={ad.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate max-w-xs block">{ad.url}</a>
          {ad.revenuePerClick !== undefined && (
            <p className="text-sm text-muted-foreground">RPC: ${ad.revenuePerClick.toFixed(2)}</p>
          )}
          {(ad.publishDate || ad.unpublishDate) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <CalendarIcon className="h-3 w-3" />
              {ad.publishDate ? format(ad.publishDate.toDate(), 'MMM d, y') : '...'} - {ad.unpublishDate ? format(ad.unpublishDate.toDate(), 'MMM d, y') : '...'}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {priorityBadge(ad.priority)}
            <Badge variant={ad.isActive ? "default" : "secondary"} className="capitalize">
              {ad.isActive ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
              {ad.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(ad)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the ad "{ad.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(ad)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}


export default function AdminAdsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const adsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'ads') : null, [firestore]);
  const { data: ads, isLoading, error } = useCollection<Ad>(adsCollection);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  const { currentAds, pastAds } = useMemo(() => {
    if (!ads) return { currentAds: [], pastAds: [] };
    const now = new Date();
    const currentAds: Ad[] = [];
    const pastAds: Ad[] = [];
    ads.forEach(ad => {
      const unpublishDate = ad.unpublishDate?.toDate();
      if (ad.isActive && (!unpublishDate || unpublishDate > now)) {
        currentAds.push(ad);
      } else {
        pastAds.push(ad);
      }
    });
    return { currentAds, pastAds };
  }, [ads]);

  const handleFormSubmit = async (values: any) => {
    if (!firestore || !adsCollection) return;
    
    let imageUrl = values.imageUrl;
    if (values.imageFile) {
      if (editingAd?.imageUrl) {
        await deleteFile(editingAd.imageUrl).catch(console.warn);
      }
      imageUrl = await uploadFile(values.imageFile, `ads/${values.imageFile.name}`);
    }

    const adData = { 
      ...values, 
      imageUrl,
      publishDate: values.publishDate ? Timestamp.fromDate(values.publishDate) : null,
      unpublishDate: values.unpublishDate ? Timestamp.fromDate(values.unpublishDate) : null,
    };
    delete adData.imageFile;

    if (editingAd) {
      const adDoc = doc(firestore, 'ads', editingAd.id);
      updateDoc(adDoc, adData)
        .then(() => {
          toast({ title: "Ad Updated", description: `The ad "${adData.name}" has been successfully updated.` });
        })
        .catch(error => {
          const contextualError = new FirestorePermissionError({
            path: adDoc.path,
            operation: 'update',
            requestResourceData: adData,
          });
          errorEmitter.emit('permission-error', contextualError);
        });
    } else {
      addDoc(adsCollection, adData)
        .then(() => {
          toast({ title: "Ad Added", description: `The ad "${adData.name}" has been successfully added.` });
        })
        .catch(error => {
          const contextualError = new FirestorePermissionError({
            path: (adsCollection as CollectionReference).path,
            operation: 'create',
            requestResourceData: adData,
          });
          errorEmitter.emit('permission-error', contextualError);
        });
    }

    setIsFormOpen(false);
    setEditingAd(null);
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setIsFormOpen(true);
  }

  const handleDelete = async (ad: Ad) => {
    if (!firestore) return;
    try {
      if (ad.imageUrl) {
        await deleteFile(ad.imageUrl);
      }
      const adDoc = doc(firestore, 'ads', ad.id);
      await deleteDoc(adDoc);
      toast({ title: "Ad Deleted", description: `The ad "${ad.name}" has been deleted.` });
    } catch (error) {
      console.error("Error deleting ad: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete ad." });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
          title="Manage Ads"
          description="Create, edit, and manage ad listings for the website."
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingAd(null); setIsFormOpen(true) }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Ad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingAd ? 'Edit Ad' : 'Add New Ad'}</DialogTitle>
            </DialogHeader>
             <ScrollArea className="h-full pr-6">
                <AdForm
                onSubmit={handleFormSubmit}
                initialData={editingAd}
                onCancel={() => setIsFormOpen(false)}
                />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Current Ad Listings</CardTitle>
            <CardDescription>A list of all ads currently active or scheduled to be active.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading ads...</p>
            ) : error ? (
              <div className="text-red-600 bg-red-100 p-4 rounded-md">
                  <h3 className="font-bold">Error loading ads</h3>
                  <p>{error.message}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentAds.length > 0 ? (
                  currentAds.map((ad) => (
                    <AdItem key={ad.id} ad={ad} onEdit={handleEdit} onDelete={handleDelete} />
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No current ads have been created yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Past Ad Listings</CardTitle>
            <CardDescription>A list of ads that are inactive or have expired.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading ads...</p>
            ) : error ? (
              <div className="text-red-600 bg-red-100 p-4 rounded-md">
                  <h3 className="font-bold">Error loading ads</h3>
                  <p>{error.message}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastAds.length > 0 ? (
                  pastAds.map((ad) => (
                     <AdItem key={ad.id} ad={ad} onEdit={handleEdit} onDelete={handleDelete} />
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No past ads found.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
