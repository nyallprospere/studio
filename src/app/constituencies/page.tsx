

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Constituency } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase, useUser, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { debounce, isEqual } from 'lodash';
import { InteractiveSvgMap } from '@/components/interactive-svg-map';
import { Save, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function ConstituenciesPageSkeleton() {
    return (
      <div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2 mt-2" />
        <div className="mt-8">
          <Skeleton className="h-[70vh] w-full" />
        </div>
      </div>
    );
}

const DEFAULT_LAYOUT = {
    pageTitle: 'Constituencies',
    pageDescription: 'Explore the 17 electoral districts of St. Lucia.',
    seatCountTitle: 'Seat Count',
    seatCountDescription: 'Current political leaning of the 17 constituencies.',
};

type LayoutConfiguration = typeof DEFAULT_LAYOUT;

export default function ConstituenciesPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();

    const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
    const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);

    const layoutRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'pageLayouts') : null, [firestore]);
    const { data: savedLayouts, isLoading: loadingLayout } = useDoc(layoutRef);

    const [pageTitle, setPageTitle] = useState(DEFAULT_LAYOUT.pageTitle);
    const [pageDescription, setPageDescription] = useState(DEFAULT_LAYOUT.pageDescription);
    
    const [isEditingPageTitle, setIsEditingPageTitle] = useState(false);
    const [isEditingPageDescription, setIsEditingPageDescription] = useState(false);
    const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);

    const [editableConstituencies, setEditableConstituencies] = useState<Constituency[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const hasUnsavedChanges = useMemo(() => {
        if (!constituencies || !editableConstituencies) return false;
        // Sort both arrays by ID to ensure correct comparison
        const sortedOriginal = [...constituencies].sort((a, b) => a.id.localeCompare(b.id));
        const sortedEditable = [...editableConstituencies].sort((a, b) => a.id.localeCompare(b.id));
        return !isEqual(sortedOriginal, sortedEditable);
    }, [constituencies, editableConstituencies]);

    
    useEffect(() => {
        if(constituencies) {
            setEditableConstituencies(JSON.parse(JSON.stringify(constituencies)));
        }
    }, [constituencies]);


    const debouncedSaveLayout = useCallback(
        debounce((layout: Partial<LayoutConfiguration>) => {
            if (firestore && user) {
                const docRef = doc(firestore, 'settings', 'pageLayouts');
                const layoutData = { constituenciesPage: layout };
                setDoc(docRef, layoutData, { merge: true })
                  .catch((error) => {
                    const contextualError = new FirestorePermissionError({
                      path: docRef.path,
                      operation: 'update',
                      requestResourceData: layoutData,
                    });
                    errorEmitter.emit('permission-error', contextualError);
                  });
            }
        }, 1000), [firestore, user]
    );

    useEffect(() => {
        if (!user) return; // Only save layout if a user is logged in.
        const layoutState = { pageTitle, pageDescription };
        debouncedSaveLayout(layoutState);
    }, [pageTitle, pageDescription, debouncedSaveLayout, user]);


    useEffect(() => {
        const savedConstituenciesLayout = savedLayouts?.constituenciesPage as LayoutConfiguration | undefined;
        if (savedConstituenciesLayout) {
            setPageTitle(savedConstituenciesLayout.pageTitle || DEFAULT_LAYOUT.pageTitle);
            setPageDescription(savedConstituenciesLayout.pageDescription || DEFAULT_LAYOUT.pageDescription);
        }
    }, [savedLayouts]);
    
    const handleLeaningChange = useCallback((id: string, newLeaning: string) => {
        setEditableConstituencies(prev =>
            prev.map(c =>
                c.id === id ? { ...c, politicalLeaning: newLeaning as Constituency['politicalLeaning'] } : c
            )
        );
    }, []);

    const handlePredictionChange = useCallback((id: string, slp: number, uwp: number) => {
        setEditableConstituencies(prev =>
            prev.map(c =>
                c.id === id ? { ...c, predictedSlpPercentage: slp, predictedUwpPercentage: uwp } : c
            )
        );
    }, []);

    const handleSaveAll = async () => {
        if (!firestore || !user) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            editableConstituencies.forEach(c => {
                const { id, ...dataToSave } = c;
                const docRef = doc(firestore, 'constituencies', id);
                batch.update(docRef, dataToSave as any);
            });
            await batch.commit();
            toast({ title: 'Success', description: 'Your changes have been saved.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save changes.' });
        } finally {
            setIsSaving(false);
        }
    }


    const isLoading = loadingConstituencies || loadingLayout;

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-8">
            <div>
                <div onClick={() => user && setIsEditingPageTitle(true)}>
                    {isEditingPageTitle && user ? (
                        <div className="flex items-center gap-2 max-w-lg">
                            <Input value={pageTitle} onChange={e => setPageTitle(e.target.value)} className="text-3xl md:text-4xl font-bold tracking-tight font-headline" />
                            <Button onClick={(e) => {e.stopPropagation(); setIsEditingPageTitle(false);}}>Save</Button>
                        </div>
                    ) : (
                        <h1 className="text-3xl font-bold tracking-tight font-headline text-primary md:text-4xl">
                            {pageTitle}
                        </h1>
                    )}
                </div>
                <div onClick={() => user && setIsEditingPageDescription(true)}>
                    {isEditingPageDescription && user ? (
                        <div className="flex items-center gap-2 max-w-lg mt-2">
                            <Input value={pageDescription} onChange={e => setPageDescription(e.target.value)} className="text-lg" />
                            <Button onClick={(e) => {e.stopPropagation(); setIsEditingPageDescription(false);}}>Save</Button>
                        </div>
                    ) : (
                        <p className="mt-2 text-lg text-muted-foreground">{pageDescription}</p>
                    )}
                </div>
            </div>
            {user && hasUnsavedChanges && (
                <Button onClick={handleSaveAll} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            )}
             {user && (
                <Button asChild variant="outline">
                    <Link href="/admin/constituencies">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Data
                    </Link>
                </Button>
            )}
        </div>

      {isLoading || !editableConstituencies ? (
          <ConstituenciesPageSkeleton />
      ) : (
        <InteractiveSvgMap 
            constituencies={editableConstituencies} 
            selectedConstituencyId={selectedConstituencyId}
            onConstituencyClick={setSelectedConstituencyId}
            onLeaningChange={user ? handleLeaningChange : undefined}
            onPredictionChange={user ? handlePredictionChange : undefined}
        />
      )}
    </div>
  );
}
