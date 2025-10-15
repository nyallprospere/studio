import type { Party, Candidate, Constituency, Poll, ElectionYearResult } from '@/lib/types';

// This file is now for type exports and legacy functions.
// All data is intended to be fetched from Firestore.

// The functions below are deprecated and will be removed once all components are updated to use Firestore hooks.
export const getPartyById = (id: string, partiesData: Party[]) => partiesData.find(p => p.id === id);
export const getCandidateById = (id: string, candidatesData: Candidate[]) => candidatesData.find(c => c.id === id);
export const getConstituencyById = (id: string, constituenciesData: Constituency[]) => constituenciesData.find(c => c.id === id);
