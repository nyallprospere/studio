
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import type { Party, Election, PartyLogo, Constituency, Candidate } from '@/lib/types';
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
  DialogTitle as VisuallyHiddenTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export default function ManageLogosPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const electionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'elections') : null, [firestore]);
  const partyLogosQuery = useMemoFirebase(() => firestore ? collection(firestore, 'party_logos') : null, [firestore]);
  const constituenciesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'constituencies') : null, [firestore]);
  const candidatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'candidates') : null, [firestore]);

  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: partyLogos, isLoading: loadingLogos, error } = useCollection<PartyLogo>(partyLogosQuery);
  const { data: constituencies, isLoading: loadingConstituencies } = useCollection<Constituency>(constituenciesQuery);
  const { data: candidates, isLoading: loadingCandidates } = useCollection<Candidate>(candidatesQuery);
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedPartyForUpload, setSelectedPartyForUpload] = useState<Party | null>(null);
  const [deleteLocks, setDeleteLocks] = useState<Record<string, boolean>>({});
  const [electionFilter, setElectionFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('');

  const sortedElections = useMemo(() => elections?.sort((a, b) => b.year - a.year) || [], [elections]);

  useMemo(() => {
    if (sortedElections.length > 0 && electionFilter === '') {
        const election2026 = sortedElections.find(e => e.year === 2026);
        setElectionFilter(election2026 ? election2026.id : 'all');
    }
  }, [sortedElections, electionFilter]);


  const allParties = useMemo(() => {
    if (!parties) return [];
    
    let partyList: Party[] = [...parties];
    
    partyList.push({ id: 'independent', name: 'Independent', acronym: 'IND', color: '#808080' } as Party);
    
    if (activeTab && !partyList.some(p => p.id === activeTab)) {
        setActiveTab(partyList[0]?.id || '');
    } else if (!activeTab && partyList.length > 0) {
      setActiveTab(partyList[0].id);
    }

    return partyList;
  }, [parties, activeTab]);
  
  const handleUploadClick = (party: Party) => {
    setSelectedPartyForUpload(party);
    setIsUploadDialogOpen(true);
  };
  
  const handleUploadSuccess = () => {
    setIsUploadDialogOpen(false);
    toast({ title: 'Logos Updated Successfully' });
  }

  const logoGroupsByParty = useMemo(() => {
    if (!allParties || !partyLogos || !sortedElections || !candidates || !constituencies) {
      return {};
    }
  
    const allLogoGroups: Record<string, any[]> = {};
  
    for (const party of allParties) {
      const partyId = party.id;
      let logosForParty = partyLogos.filter(logo => logo.partyId === partyId);

      if (partyId === 'independent' && activeTab === 'independent' && electionFilter !== 'all') {
        logosForParty = logosForParty.filter(logo => logo.electionId === electionFilter);
      }
  
      if (partyId === 'independent') {
        allLogoGroups[partyId] = logosForParty.map(logo => {
          const election = sortedElections.find(e => e.id === logo.electionId);
          const candidate = candidates.find(c => c.partyId === 'independent' && c.constituencyId === logo.constituencyId);
          const constituency = constituencies.find(c => c.id === logo.constituencyId);
  
          return {
            logoUrl: logo.logoUrl,
            expandedLogoUrl: logo.expandedLogoUrl,
            dateRange: election?.year.toString() || 'N/A',
            maxYear: election?.year || 0,
            electionIds: [logo.electionId],
            key: logo.id,
            candidateName: candidate?.name,
            constituencyName: constituency?.name,
            constituencyId: logo.constituencyId
          };
        }).sort((a, b) => b.maxYear - a.maxYear);
      } else {
        // Group by a combination of standard and expanded logo URLs to treat them as a single visual identity
        const groupedByLogoPair = groupBy(logosForParty, logo => `${logo.logoUrl || 'null'}|${logo.expandedLogoUrl || 'null'}`);
  
        allLogoGroups[partyId] = Object.entries(groupedByLogoPair).map(([key, group]) => {
          if (group.length === 0) return null;
          const first = group[0];
          const electionIds = group.map(g => g.electionId);
          const groupElections = sortedElections.filter(e => electionIds.includes(e.id));
  
          if (groupElections.length === 0) return null;
  
          const years = groupElections.map(e => e.year).sort((a, b) => b - a);
  
          return {
            logoUrl: first.logoUrl,
            expandedLogoUrl: first.expandedLogoUrl,
            dateRange: years.join(', '),
            maxYear: Math.max(...years),
            electionIds: electionIds,
            key: key, 
            logoIds: group.map(g => g.id),
            candidateName: null,
            constituencyName: null,
          };
        }).filter((g): g is NonNullable<typeof g> => g !== null)
          .sort((a, b) => b.maxYear - a.maxYear);
      }
    }
    return allLogoGroups;
  }, [allParties, partyLogos, sortedElections, candidates, constituencies, activeTab, electionFilter]);
  
  
  const handleDeleteLogos = async (partyId: string, logoIds: string[], electionIds: string[]) => {
    if (!firestore || !partyLogos) return;
    
    let logoDocsToDelete: PartyLogo[] = [];

    // If logoIds are provided (from party grouping), use them
    if (logoIds && logoIds.length > 0) {
        logoDocsToDelete = partyLogos.filter(logo => logoIds.includes(logo.id));
    } 
    // Fallback for independents or if logoIds aren't available
    else if (partyId === 'independent' && electionIds.length > 0) {
        logoDocsToDelete = partyLogos.filter(logo => logo.partyId === partyId && electionIds.includes(logo.electionId));
    } else {
        logoDocsToDelete = partyLogos.filter(logo => 
            logo.partyId === partyId && electionIds.includes(logo.electionId)
        );
    }

    if (logoDocsToDelete.length === 0) {
        toast({variant: 'destructive', title: 'Error', description: 'Could not find logo entries to delete.'});
        return;
    }

    try {
        const batch = writeBatch(firestore);
        for(const logoDoc of logoDocsToDelete) {
            if (logoDoc.logoUrl) await deleteFile(logoDoc.logoUrl).catch(console.warn);
            if (logoDoc.expandedLogoUrl) await deleteFile(logoDoc.expandedLogoUrl).catch(console.warn);
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


  const isLoading = loadingParties || loadingElections || loadingLogos || loadingConstituencies || loadingCandidates;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <PageHeader
            title="Manage Party Logos"
            description="Assign specific logos to parties for each election."
        />
        <div className="flex items-center gap-2">
            {activeTab === 'independent' && (
                <Select value={electionFilter} onValueChange={setElectionFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {sortedElections.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
      </div>

      {isLoading ? <p>Loading...</p> : 
       error ? <p className="text-destructive">Error loading logos: {error.message}</p> :
       (
        <>
          <LogoUploadDialog
            isOpen={isUploadDialogOpen}
            onClose={() => setIsUploadDialogOpen(false)}
            party={selectedPartyForUpload}
            elections={elections || []}
            constituencies={constituencies || []}
            onSuccess={handleUploadSuccess}
          />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                  {allParties.map(party => (
                      <TabsTrigger key={party.id} value={party.id} style={{ color: party.color }}>{party.name}</TabsTrigger>
                  ))}
              </TabsList>
              {allParties.map(party => {
                const logoGroups = logoGroupsByParty[party.id] || [];
                return (
                  <TabsContent key={party.id} value={party.id}>
                      <Card>
                          <CardHeader className="flex flex-row justify-between items-center">
                              <div>
                                  <CardTitle style={{color: party.color}}>{party.name}</CardTitle>
                                  <CardDescription>Manage logos for the {party.name === 'Independent' ? 'Independent candidates' : party.acronym}.</CardDescription>
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
                                  <h4 className="font-semibold">{group.dateRange}</h4>
                                  {party.id !== 'independent' ? null : group.constituencyName ? (
                                    <p className="text-sm text-muted-foreground">{group.constituencyName}</p>
                                  ) : null}
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
                                                    <VisuallyHiddenTitle>Standard Logo Preview</VisuallyHiddenTitle>
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
                                                    <VisuallyHiddenTitle>Expanded Logo Preview</VisuallyHiddenTitle>
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
                                                    This will delete the logo entries for {group.dateRange}. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteLogos(party.id, group.logoIds || [], group.electionIds)}>
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
