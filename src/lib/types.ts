

export interface Party {
  id: string;
  name: string;
  acronym: string;
  leader: string;
  founded: number;
  color: string;
  seats?: number;
  logoUrl?: string; // URL to logo in storage
  description?: string;
  history?: string;
  manifestoUrl?: string; // URL to PDF in storage
  manifestoSummary?: string;
  website?: string;
}

export interface Candidate {
  id:string;
  firstName: string;
  lastName: string;
  name: string; // Combined for simplicity
  partyId: string;
  constituencyId: string;
  bio: string;
  imageUrl?: string; // URL to photo in storage
  policyPositions: { title: string; description: string }[];
  isIncumbent?: boolean;
  isPartyLeader?: boolean;
  isDeputyLeader?: boolean;
  partyLevel?: 'higher' | 'lower';
}

export interface ArchivedCandidate extends Omit<Candidate, 'id' | 'name'> {
    id: string;
    originalId: string;
    archiveId: string;
    archiveDate: string;
}


export interface Constituency {
  id: string;
  name: string;
  mapImageUrl?: string; // URL to map in storage
  demographics: {
    registeredVoters: number;
  };
  mapCoordinates?: {
    top: string;
    left: string;
  };
  politicalLeaning?: 'solid-slp' | 'lean-slp' | 'tossup' | 'lean-uwp' | 'solid-uwp';
  predictedSlpPercentage?: number;
  predictedUwpPercentage?: number;
}

export interface Poll {
  id: string;
  source: string;
  date: string; // Stored as ISO string
  results: {
    partyId: string;
    percentage: number;
  }[];
}

export interface Event {
  id: string;
  partyId: string;
  title: string;
  date: string; // Stored as ISO string or Firestore Timestamp
  location: string;
  description?: string;
  imageUrl?: string;
}

export interface Election {
    id: string;
    name: string;
    year: number;
    description?: string;
    uwpLeader?: string;
    uwpLeaderImageUrl?: string;
    slpLeader?: string;
    slpLeaderImageUrl?: string;
    isCurrent?: boolean;
}

export interface ElectionResult {
  id: string;
  electionId: string;
  constituencyId: string;
  uwpVotes: number;
  slpVotes: number;
  otherVotes: number;
  totalVotes: number;
  registeredVoters: number;
  turnout: number;
}


// This type is used for displaying aggregated results, not for data entry.
export interface ElectionYearResult {
  id: string;
  year: number;
  summary: {
    partyId: string;
    seats: number;
    totalVotes: number;
  }[];
  constituencyResults: {
      constituencyId: string;
      candidateName: string;
      partyId: string;
      votes: number;
      isWinner: boolean;
  }[];
}

export interface SiteSettings {
    mapUrl?: string;
}

    
