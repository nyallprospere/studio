
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
import { Upload, Shield, Pencil } from 'lucide-react';
import { LogoUploadDialog } from './logo-upload-dialog';
import { groupBy } from 'lodash';
import { Button } from '@/components/ui/button';

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
    
    // Create a unique key for each logo combination
    const groupedByLogo = groupBy(logosForParty, logo => `${logo.logoUrl || ''}|${logo.expandedLogoUrl || ''}`);

    return Object.values(groupedByLogo).map(group => {
      const first = group[0];
      const electionIds = group.map(g => g.electionId);
      const groupElections = sortedElections.filter(e => electionIds.includes(e.id));
      
      if (groupElections.length === 0) return null;

      // Create a display string for all years
      const years = groupElections.map(e => e.year).sort((a,b) => b - a).join(', ');
      
      return {
        logoUrl: first.logoUrl,
        expandedLogoUrl: first.expandedLogoUrl,
        dateRange: years,
        key: `${first.logoUrl || ''}|${first.expandedLogoUrl || ''}`
      };
    }).filter(g => g !== null);
  };


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
                                  <CardDescription>Manage logos for the {party.name}.</CardDescription>
                              </div>
                              <Button
                                onClick={() => handleUploadClick(party)}
                              >
                                <Upload className="h-4 w-4" />
                                Upload Logos
                              </Button>
                          </CardHeader>
                          <CardContent className="space-y-4">
                          {logoGroups.length > 0 ? logoGroups.map(group => {
                            return (
                              <div key={group.key} className="p-4 border rounded-md">
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-semibold">Applicable Years: {group.dateRange}</h4>
                                  <Button variant="outline" size="sm">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 items-end">
                                  <div className="flex flex-col items-center gap-2">
                                      <p className="text-sm font-medium">Standard Logo</p>
                                      <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center">
                                          {group.logoUrl ? <Image src={group.logoUrl} alt="Standard Logo" width={80} height={80} className="object-contain" /> : <Shield className="h-8 w-8 text-muted-foreground" />}
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-2">
                                      <p className="text-sm font-medium">Expanded Logo</p>
                                      <div className="h-20 w-32 bg-muted rounded-md flex items-center justify-center">
                                          {group.expandedLogoUrl ? <Image src={group.expandedLogoUrl} alt="Expanded Logo" width={128} height={80} className="object-contain"/> : <Shield className="h-8 w-8 text-muted-foreground" />}
                                      </div>
                                  </div>
                                </div>
                              </div>
                            )
                          }) : (
                             <p className="text-center text-muted-foreground py-8">No logos found for this party.</p>
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
