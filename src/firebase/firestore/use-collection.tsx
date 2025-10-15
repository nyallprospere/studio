'use client';
import { useFirestore } from '@/firebase/provider';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAt,
  endAt,
  QueryConstraint,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

interface UseCollectionOptions<T> {
  where?: [string, '==', any];
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  startAt?: any;
  endAt?: any;
}

export function useCollection<T>(path: string, options?: UseCollectionOptions<T>) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    const constraints: QueryConstraint[] = [];
    if (options?.where) {
      constraints.push(where(...options.where));
    }
    if (options?.orderBy) {
      constraints.push(orderBy(...options.orderBy));
    }
    if (options?.limit) {
      constraints.push(limit(options.limit));
    }
    if (options?.startAt) {
      constraints.push(startAt(options.startAt));
    }
    if (options?.endAt) {
      constraints.push(endAt(options.endAt));
    }

    const q = query(collection(firestore, path), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(documents);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [path, firestore, options]);

  return { data, loading, error };
}
