'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export default function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error(error); // Log the full error for debugging

      // Throw the error in development to make it visible in the Next.js overlay
      if (process.env.NODE_ENV === 'development') {
        // A bit of a hack to make the error show up in the overlay
        setTimeout(() => {
            throw error;
        }, 0);
      }

      // Show a user-friendly toast in production
      if (process.env.NODE_ENV === 'production') {
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: "You don't have permission to perform this action.",
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.removeListener('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component doesn't render anything
}
