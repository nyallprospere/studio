
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import type { Party, Election, PartyLogo } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { uploadFile, deleteFile } from '@/firebase/storage';
import Image from 'next/image';
import { Upload, Shield } from 'lucide-react';

export default function ManageLogosPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const partiesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parties') : null, [firestore]);
  const electionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'elections') : null, [firestore]);
  const partyLogosQuery = useMemoFirebase(() => firestore ? collection(firestore, 'party_logos') : null, [firestore]);

  const { data: parties, isLoading: loadingParties } = useCollection<Party>(partiesQuery);
  const { data: elections, isLoading: loadingElections } = useCollection<Election>(electionsQuery);
  const { data: partyLogos, isLoading: loadingLogos } = useCollection<PartyLogo>(partyLogosQuery);
  
  const [logoFiles, setLogoFiles] = useState<Record<string, { standard?: File, expanded?: File }>>({});

  const sortedElections = useMemo(() => elections?.sort((a, b) => b.year - a.year), [elections]);

  const allParties = useMemo(() => {
    if (!parties) return [];
    return [...parties, { id: 'independent', name: 'Independent', acronym: 'IND', color: '#808080' } as Party];
  }, [parties]);

  const handleFileChange = (partyId: string, type: 'standard' | 'expanded', file: File) => {
    setLogoFiles(prev => ({
      ...prev,
      [partyId]: { ...prev[partyId], [type]: file }
    }));
  };

  const handleUpload = async (partyId: string, electionId: string) => {
    if (!firestore) return;

    const files = logoFiles[partyId];
    if (!files || (!files.standard && !files.expanded)) {
      toast({ variant: 'destructive', title: 'No file selected' });
      return;
    }

    const existingLogoQuery = query(
      collection(firestore, 'party_logos'),
      where('partyId', '==', partyId),
      where('electionId', '==', electionId)
    );
    const existingLogoSnap = await getDocs(existingLogoQuery);
    const existingLogoDoc = existingLogoSnap.docs[0];

    try {
      let standardUrl = existingLogoDoc?.data()?.logoUrl;
      let expandedUrl = existingLogoDoc?.data()?.expandedLogoUrl;

      if (files.standard) {
        if (standardUrl) await deleteFile(standardUrl).catch(console.warn);
        standardUrl = await uploadFile(files.standard, `logos/${partyId}_${electionId}_std.png`);
      }
      if (files.expanded) {
        if (expandedUrl) await deleteFile(expandedUrl).catch(console.warn);
        expandedUrl = await uploadFile(files.expanded, `logos/${partyId}_${electionId}_exp.png`);
      }

      const dataToSave = {
        partyId,
        electionId,
        logoUrl: standardUrl,
        expandedLogoUrl: expandedUrl,
      };

      if (existingLogoDoc) {
        await updateDoc(doc(firestore, 'party_logos', existingLogoDoc.id), dataToSave);
      } else {
        await addDoc(collection(firestore, 'party_logos'), dataToSave);
      }

      toast({ title: 'Logos Updated Successfully' });
      setLogoFiles(prev => ({ ...prev, [partyId]: {} }));
    } catch (error) {
      console.error("Error uploading logos:", error);
      toast({ variant: 'destructive', title: 'Upload Failed' });
    }
  };

  const isLoading = loadingParties || loadingElections || loadingLogos;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Party Logos"
        description="Assign specific logos to parties for each election."
      />

      {isLoading ? <p>Loading...</p> : (
        <div className="space-y-8">
          {allParties.map(party => (
            <Card key={party.id}>
              <CardHeader>
                <CardTitle style={{color: party.color}}>{party.name}</CardTitle>
                <CardDescription>Manage logos for the {party.name}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedElections?.map(election => {
                  const logoSet = partyLogos?.find(l => l.partyId === party.id && l.electionId === election.id);
                  return (
                    <div key={election.id} className="p-4 border rounded-md">
                      <h4 className="font-semibold mb-4">{election.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm font-medium">Standard Logo</p>
                            <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center">
                                {logoSet?.logoUrl ? <Image src={logoSet.logoUrl} alt="Standard Logo" width={80} height={80} className="object-contain" /> : <Shield className="h-8 w-8 text-muted-foreground" />}
                            </div>
                            <Input type="file" onChange={(e) => handleFileChange(party.id, 'standard', e.target.files![0])} className="text-xs" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                             <p className="text-sm font-medium">Expanded Logo</p>
                            <div className="h-20 w-32 bg-muted rounded-md flex items-center justify-center">
                                {logoSet?.expandedLogoUrl ? <Image src={logoSet.expandedLogoUrl} alt="Expanded Logo" width={128} height={80} className="object-contain"/> : <Shield className="h-8 w-8 text-muted-foreground" />}
                            </div>
                            <Input type="file" onChange={(e) => handleFileChange(party.id, 'expanded', e.target.files![0])} className="text-xs" />
                        </div>
                        <div className="col-span-2 flex justify-end">
                           <Button onClick={() => handleUpload(party.id, election.id)} disabled={!logoFiles[party.id]}>
                                <Upload className="mr-2 h-4 w-4" />
                                Save for {election.year}
                            </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
