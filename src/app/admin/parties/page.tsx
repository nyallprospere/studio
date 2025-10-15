'use client';

import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function AdminPartiesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const handleTestWrite = async () => {
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Firestore is not available.",
        });
        return;
    }

    setIsLoading(true);
    
    const partyData = {
      name: "Test Party",
      acronym: "TEST",
      leader: "Test Leader",
      founded: 2024,
      color: "#FF0000",
      description: "This is a test entry.",
    };
    
    try {
        const collectionRef = collection(firestore, 'parties');
        await addDoc(collectionRef, partyData);
        
        toast({
            title: 'Success!',
            description: 'The test write to Firestore was successful.',
        });

    } catch (error: any) {
        // Even though we have the global listener, we can toast here for immediate feedback.
        toast({
            variant: "destructive",
            title: "Test Write Failed",
            description: error.message || "An unknown error occurred.",
        });

        // Also emit the structured error for the dev overlay
        const permissionError = new FirestorePermissionError({
            path: 'parties',
            operation: 'create',
            requestResourceData: partyData
        });
        errorEmitter.emit('permission-error', permissionError);

    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <PageHeader
        title="Manage Parties (Diagnostic Mode)"
        description="Testing Firestore write functionality."
      />
      <Card>
        <CardHeader>
          <CardTitle>Firestore Write Test</CardTitle>
          <CardDescription>
            Click the button below to attempt a direct write to the 'parties' collection.
            This will help diagnose the ongoing permission issue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestWrite} disabled={isLoading}>
             {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Firestore Write Test'
              )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
