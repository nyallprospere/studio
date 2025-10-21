
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import type { Party, Election, PartyLogo } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { uploadFile, deleteFile } from '@/firebase/storage';
import Image from 'next/image';
import { Upload, Shield } from 'lucide-react';
import { LogoUploadDialog } from './logo-upload-dialog';

export default function ManageLogosPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const electionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'elections') : null, [firestore]);
  const partyLogosQuery = useMemoFirebase(() => firestore ? collection(firestore, 'party_logos') : null, [firestore]);

  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: partyLogos, isLoading: loadingLogos } = useCollection<PartyLogo>(partyLogosQuery);
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedPartyForUpload, setSelectedPartyForUpload] = useState<Party | null>(null);

  const sortedElections = useMemo(() => elections?.sort((a, b) => b.year - a.year), [elections]);

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

  const isLoading = loadingParties || loadingElections || loadingLogos;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Party Logos"
        description="Assign specific logos to parties for each election."
      />

      {isLoading ? <p>Loading...</p> : (
        <>
          <LogoUploadDialog
            isOpen={isUploadDialogOpen}
            onClose={() => setIsUploadDialogOpen(false)}
            party={selectedPartyForUpload}
            elections={sortedElections || []}
            onSuccess={handleUploadSuccess}
          />
          <Tabs defaultValue={allParties[0]?.id} className="w-full">
              <TabsList>
                  {allParties.map(party => (
                      <TabsTrigger key={party.id} value={party.id} style={{ color: party.color }}>{party.name}</TabsTrigger>
                  ))}
              </TabsList>
              {allParties.map(party => (
                  <TabsContent key={party.id} value={party.id}>
                      <Card>
                          <CardHeader className="flex flex-row justify-between items-center">
                              <div>
                                  <CardTitle style={{color: party.color}}>{party.name}</CardTitle>
                                  <CardDescription>Manage logos for the {party.name}.</CardDescription>
                              </div>
                              <button
                                onClick={() => handleUploadClick(party)}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                              >
                                <Upload className="h-4 w-4" />
                                Upload Logos
                              </button>
                          </CardHeader>
                          <CardContent className="space-y-4">
                          {sortedElections?.map(election => {
                            const logoSet = partyLogos?.find(l => l.partyId === party.id && l.electionId === election.id);
                            return (
                              <div key={election.id} className="p-4 border rounded-md">
                                <h4 className="font-semibold mb-4">{election.name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 items-end">
                                  <div className="flex flex-col items-center gap-2">
                                      <p className="text-sm font-medium">Standard Logo</p>
                                      <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center">
                                          {logoSet?.logoUrl ? <Image src={logoSet.logoUrl} alt="Standard Logo" width={80} height={80} className="object-contain" /> : <Shield className="h-8 w-8 text-muted-foreground" />}
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-2">
                                      <p className="text-sm font-medium">Expanded Logo</p>
                                      <div className="h-20 w-32 bg-muted rounded-md flex items-center justify-center">
                                          {logoSet?.expandedLogoUrl ? <Image src={logoSet.expandedLogoUrl} alt="Expanded Logo" width={128} height={80} className="object-contain"/> : <Shield className="h-8 w-8 text-muted-foreground" />}
                                      </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          </CardContent>
                      </Card>
                  </TabsContent>
              ))}
          </Tabs>
        </>
      )}
    </div>
  );
}
