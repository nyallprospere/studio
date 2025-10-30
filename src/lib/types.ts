

export interface Party {
  id: string;
  name: string;
  acronym: string;
  leader: string;
  founded: number;
  color: string;
  seats?: number;
  logoUrl?: string; // URL to logo in storage
  expandedLogoUrl?: string; // URL to a larger logo in storage
  oldLogoUrl?: string;
  manifestoUrl?: string; // URL to PDF in storage
  manifestoSummary?: string;
  website?: string;
}

export interface PartyLogo {
  id: string;
  partyId: string;
  electionId: string;
  constituencyId?: string;
  logoUrl: string;
  expandedLogoUrl?: string;
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
  customLogoUrl?: string; // URL to a custom logo for this candidate
  policyPositions: { title: string; description: string }[];
  isIncumbent?: boolean;
  isPartyLeader?: boolean;
  isDeputyLeader?: boolean;
  partyLevel?: 'higher' | 'lower';
  isIndependentCastriesNorth?: boolean;
  isIndependentCastriesCentral?: boolean;
}

export interface ArchivedCandidate extends Omit<Candidate, 'id' | 'name'> {
    id: string;
    originalId: string;
    archiveDate: string;
    electionId: string;
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
  politicalLeaning?: 'solid-slp' | 'lean-slp' | 'tossup' | 'lean-uwp' | 'solid-uwp' | 'slp' | 'uwp' | 'unselected' | 'ind';
  predictedSlpPercentage?: number;
  predictedUwpPercentage?: number;
  logoUrl?: string;
  slpDashboardPopoverText?: string;
  uwpDashboardPopoverText?: string;
  volatilityIndex?: number;
  aiForecastParty?: 'slp' | 'uwp' | 'ind';
  aiForecast?: number;
  aiConfidence?: 'High' | 'Medium' | 'Low';
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
  date: string; // Stored as ISO or Firestore Timestamp
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
    independentLogoUrl?: string;
    independentExpandedLogoUrl?: string;
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

export interface UserMap {
  id: string;
  createdAt: any;
  mapData: {
    constituencyId: string;
    politicalLeaning: string;
  }[];
  imageUrl?: string;
  ipAddress?: string;
  city?: string;
  country?: string;
}

export interface SiteSettings {
    defaultShareTitle: string;
    defaultShareDescription: string;
}

export interface Region {
  id: string;
  name: string;
  constituencyIds?: string[];
}

export interface Ad {
  id: string;
  name: string;
  imageUrl: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
  pages: string[];
  position: 'top' | 'bottom' | 'both';
  isActive: boolean;
  revenuePerClick?: number;
  publishDate?: any;
  unpublishDate?: any;
  clicks?: number;
  impressions?: number;
}

export interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    content?: string;
    source: string;
    url: string;
    imageUrl?: string;
    galleryImageUrls?: string[];
    publishedAt: any;
    articleDate?: any;
    author?: string;
    tags?: string[];
    likeCount?: number;
}

export interface Comment {
    id: string;
    author: string;
    text: string;
    createdAt: any;
    likeCount?: number;
    replyTo?: string;
}
    
export interface Report {
    id: string;
    articleId: string;
    commentId: string;
    commentText: string;
    commentAuthor: string;
    reportedAt: any;
    status: 'pending' | 'resolved';
}

export interface ConstituencyProjection {
    id: string;
    date: any;
    constituencies: Constituency[];
}
    
export interface VoterInformation {
  id: string;
  title: string;
  items: string[];
}
