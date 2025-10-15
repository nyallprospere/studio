export interface Party {
  id: string;
  name: string;
  acronym: string;
  leader: string;
  founded: number;
  color: string;
  logo: React.ComponentType<{ className?: string }>;
}

export interface Candidate {
  id: string;
  name: string;
  partyId: string;
  constituencyId: string;
  bio: string;
  imageId: string;
  policyPositions: { title: string; description: string }[];
}

export interface Constituency {
  id: string;
  name: string;
  mapImageId: string;
  demographics: {
    population: number;
    registeredVoters: number;
  };
  pollingLocations: string[];
}

export interface Poll {
  id: string;
  source: string;
  date: string;
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
  year: number;
  summary: {
    partyId: string;
    seats: number;
    totalVotes: number;
  }[];
  constituencyResults: ConstituencyResult[];
}
