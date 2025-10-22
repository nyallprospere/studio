
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import type { Party, Election, PartyLogo } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { uploadFile, deleteFile } from '@/firebase/storage';
import Image from 'next/image';
import { Upload, Shield, Pencil, Trash2, Lock, Unlock } from 'lucide-react';
import { LogoUploadDialog } from './logo-upload-dialog';
import { groupBy } from 'lodash';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"


export default function ManageLogosPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const electionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'elections') : null, [firestore]);
  const partyLogosQuery = useMemoFirebase(() => firestore ? collection(firestore, 'party_logos') : null, [firestore]);

  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: partyLogos, isLoading: loadingLogos, error } = useCollection<PartyLogo>(partyLogosQuery);
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedPartyForUpload, setSelectedPartyForUpload] = useState<Party | null>(null);
  const [deleteLocks, setDeleteLocks] = useState<Record<string, boolean>>({});


  const sortedElections = useMemo(() => elections?.sort((a, b) => b.year - a.year) || [], [elections]);

  const allParties = useMemo(() => {
    if (!parties) return [];
    return [...parties, { id: 'independent', name: 'Independent', acronym: 'IND', color: '#808080' } as Party];
  }, [parties]);
  
  const handleUploadClick = (party: Party) => {
    setSelectedPartyForUpload(party);
    setIsUploadDialogOpen(true);
  };
  
  const handleUploadSuccess = () => {
    setIsUploadDialogOpen(false);
    toast({ title: 'Logos Updated Successfully' });
  }
  
  const getLogoGroups = (partyId: string) => {
    if (!partyLogos || !sortedElections) return [];

    const logosForParty = partyLogos.filter(logo => logo.partyId === partyId);
    
    const groupedByLogo = groupBy(logosForParty, logo => `${logo.logoUrl || ''}|${logo.expandedLogoUrl || ''}`);
    
    return Object.entries(groupedByLogo).map(([key, group]) => {
      const first = group[0];
      const electionIds = group.map(g => g.electionId);
      const groupElections = sortedElections.filter(e => electionIds.includes(e.id));
      
      if (groupElections.length === 0) return null;

      const years = groupElections.map(e => e.year).sort((a,b) => b - a);
      
      return {
        logoUrl: first.logoUrl,
        expandedLogoUrl: first.expandedLogoUrl,
        dateRange: years.join(', '),
        maxYear: Math.max(...years),
        electionIds: electionIds,
        key: key
      };
    }).filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a,b) => b.maxYear - a.maxYear);
  };
  
  const handleDeleteLogos = async (partyId: string, electionIds: string[]) => {
    if (!firestore || !partyLogos) return;

    const logoDocsToDelete = partyLogos.filter(logo => 
        logo.partyId === partyId && electionIds.includes(logo.electionId)
    );

    if (logoDocsToDelete.length === 0) {
        toast({variant: 'destructive', title: 'Error', description: 'Could not find logo entries to delete.'});
        return;
    }

    try {
        const batch = writeBatch(firestore);
        for(const logoDoc of logoDocsToDelete) {
            const docRef = doc(firestore, 'party_logos', logoDoc.id);
            batch.delete(docRef);
        }
        await batch.commit();
        toast({ title: 'Logos Deleted', description: 'The selected logo entries have been deleted.' });
    } catch(e) {
        console.error("Error deleting logos:", e);
        toast({variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete logos.'});
    }

  }


  const isLoading = loadingParties || loadingElections || loadingLogos;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Party Logos"
        description="Assign specific logos to parties for each election."
      />

      {isLoading ? <p>Loading...</p> : 
       error ? <p className="text-destructive">Error loading logos: {error.message}</p> :
       (
        <>
          <LogoUploadDialog
            isOpen={isUploadDialogOpen}
            onClose={() => setIsUploadDialogOpen(false)}
            party={selectedPartyForUpload}
            elections={elections || []}
            onSuccess={handleUploadSuccess}
          />
          <Tabs defaultValue={allParties[0]?.id} className="w-full">
              <TabsList>
                  {allParties.map(party => (
                      <TabsTrigger key={party.id} value={party.id} style={{ color: party.color }}>{party.name}</TabsTrigger>
                  ))}
              </TabsList>
              {allParties.map(party => {
                const logoGroups = getLogoGroups(party.id);
                return (
                  <TabsContent key={party.id} value={party.id}>
                      <Card>
                          <CardHeader className="flex flex-row justify-between items-center">
                              <div>
                                  <CardTitle style={{color: party.color}}>{party.name}</CardTitle>
                                  <CardDescription>Manage logos for the {party.acronym}.</CardDescription>
                              </div>
                              <Button
                                onClick={() => handleUploadClick(party)}
                              >
                                <Upload className="h-4 w-4" />
                                Upload Logos
                              </Button>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {logoGroups.length > 0 ? logoGroups.map(group => {
                            const isLocked = deleteLocks[group.key] !== false;
                            return (
                              <div key={group.key} className="p-4 border rounded-md flex flex-col gap-4">
                                <div className="text-center">
                                  <h4 className="font-semibold">Election Year</h4>
                                  <p className="text-sm text-muted-foreground">{group.dateRange}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 items-center flex-grow">
                                  <div className="flex flex-col items-center gap-2 text-center">
                                      <p className="text-sm font-medium">Standard Logo</p>
                                      <div className="relative h-20 w-20 flex items-center justify-center">
                                          {group.logoUrl ? (
                                             <Dialog>
                                                <DialogTrigger asChild>
                                                    <Image src={group.logoUrl} alt="Standard Logo" fill className="object-contain cursor-pointer" />
                                                </DialogTrigger>
                                                <DialogContent className="p-0 border-0 max-w-fit bg-transparent">
                                                    <Image src={group.logoUrl} alt="Standard Logo" width={512} height={512} className="object-contain" />
                                                </DialogContent>
                                            </Dialog>
                                          ) : <Shield className="h-8 w-8 text-muted-foreground" />}
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-2 text-center">
                                      <p className="text-sm font-medium">Expanded Logo</p>
                                      <div className="relative h-20 w-32 flex items-center justify-center">
                                          {group.expandedLogoUrl ? (
                                              <Dialog>
                                                <DialogTrigger asChild>
                                                  <Image src={group.expandedLogoUrl} alt="Expanded Logo" fill className="object-contain cursor-pointer"/>
                                                </DialogTrigger>
                                                <DialogContent className="p-0 border-0 max-w-fit bg-transparent">
                                                    <Image src={group.expandedLogoUrl} alt="Expanded Logo" width={800} height={400} className="object-contain" />
                                                </DialogContent>
                                              </Dialog>
                                          ) : <Shield className="h-8 w-8 text-muted-foreground" />}
                                      </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 mt-auto">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" className="w-full" disabled={isLocked}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will delete the logo entries for the years: {group.dateRange}. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteLogos(party.id, group.electionIds)}>
                                                    Yes, Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button variant="outline" size="icon" onClick={() => setDeleteLocks(prev => ({...prev, [group.key]: !prev[group.key]}))}>
                                        {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                    </Button>
                                </div>
                              </div>
                            )
                          }) : (
                             <p className="text-center text-muted-foreground py-8 col-span-full">No logos found for this party.</p>
                          )}
                          </CardContent>
                      </Card>
                  </TabsContent>
                );
              })}
          </Tabs>
        </>
      )}
    </div>
  );
}
