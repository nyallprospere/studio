
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
  manifestoUrl?: string; // URL to PDF in storage
  manifestoSummary?: string;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  partyId: string;
  constituencyId: string;
  bio: string;
  imageUrl?: string; // URL to photo in storage
  policyPositions: { title: string; description: string }[];
  isIncumbent?: boolean;
  isPartyLeader?: boolean;
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

export interface Election {
    id: string;
    name: string;
    year: number;
    description?: string;
}

export interface ElectionResult {
  id: string;
  electionId: string;
  constituencyId: string;
  partyId: string;
  candidateName: string;
  votes: number;
  isWinner: boolean;
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
