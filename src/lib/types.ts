
export interface Party {
  id: string;
  name: string;
  acronym: string;
  leader: string;
  founded: number;
  color: string;
  logoUrl?: string; // URL to logo in storage
  description?: string;
  manifestoUrl?: string; // URL to PDF in storage
  manifestoSummary?: string;
}

export interface Candidate {
  id: string;
  name:string;
  partyId: string;
  constituencyId: string;
  bio: string;
  imageUrl?: string; // URL to photo in storage
  policyPositions: { title: string; description: string }[];
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

export interface ConstituencyResult {
  constituencyId: string;
  candidateName: string;
  partyId: string;
  votes: number;
  isWinner: boolean;
}

export interface ElectionYearResult {
  id: string;
  year: number;
  summary: {
    partyId: string;
    seats: number;
    totalVotes: number;
  }[];
  constituencyResults: ConstituencyResult[];
}
