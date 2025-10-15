import type { Party, Candidate, Constituency, Poll, ElectionYearResult } from '@/lib/types';
import { UwpLogo, SlpLogo } from '@/components/icons';

export const parties: Party[] = [
  {
    id: 'uwp',
    name: 'United Workers Party',
    acronym: 'UWP',
    leader: 'Allen Chastanet',
    founded: 1964,
    color: '#F1C40F', // Sun Yellow
    logo: UwpLogo,
  },
  {
    id: 'slp',
    name: 'Saint Lucia Labour Party',
    acronym: 'SLP',
    leader: 'Philip J. Pierre',
    founded: 1950,
    color: '#E74C3C', // A red for contrast
    logo: SlpLogo,
  },
];

export const constituencies: Constituency[] = [
    { id: "castries-central", name: "Castries Central", mapImageId: "map1", demographics: { population: 10500, registeredVoters: 7800 }, pollingLocations: ["Castries City Hall", "Anglican School"] },
    { id: "castries-east", name: "Castries East", mapImageId: "map2", demographics: { population: 12000, registeredVoters: 8500 }, pollingLocations: ["Entrepot Secondary School"] },
    { id: "castries-north", name: "Castries North", mapImageId: "map3", demographics: { population: 11000, registeredVoters: 8100 }, pollingLocations: ["Vide Bouteille Secondary School"] },
    { id: "castries-south", name: "Castries South", mapImageId: "map4", demographics: { population: 9800, registeredVoters: 7200 }, pollingLocations: ["George Charles Secondary"] },
    { id: "castries-south-east", name: "Castries South East", mapImageId: "map5", demographics: { population: 13500, registeredVoters: 9500 }, pollingLocations: ["Forestierre Methodist Combined"] },
    { id: "gros-islet", name: "Gros Islet", mapImageId: "map6", demographics: { population: 25000, registeredVoters: 21000 }, pollingLocations: ["Gros Islet Secondary", "Corinth Secondary"] },
    { id: "babonneau", name: "Babonneau", mapImageId: "map7", demographics: { population: 14000, registeredVoters: 10000 }, pollingLocations: ["Babonneau Secondary"] },
    { id: "dennery-north", name: "Dennery North", mapImageId: "map8", demographics: { population: 8000, registeredVoters: 6000 }, pollingLocations: ["Dennery Infant School"] },
    { id: "dennery-south", name: "Dennery South", mapImageId: "map9", demographics: { population: 7500, registeredVoters: 5500 }, pollingLocations: ["Dennery Primary School"] },
    { id: "micoud-north", name: "Micoud North", mapImageId: "map10", demographics: { population: 9200, registeredVoters: 7100 }, pollingLocations: ["Micoud Secondary School"] },
    { id: "micoud-south", name: "Micoud South", mapImageId: "map11", demographics: { population: 8800, registeredVoters: 6900 }, pollingLocations: ["Desruisseaux Combined"] },
    { id: "vieux-fort-north", name: "Vieux Fort North", mapImageId: "map12", demographics: { population: 8500, registeredVoters: 6500 }, pollingLocations: ["La Ressource Combined"] },
    { id: "vieux-fort-south", name: "Vieux Fort South", mapImageId: "map13", demographics: { population: 11500, registeredVoters: 8800 }, pollingLocations: ["Vieux Fort Comprehensive"] },
    { id: "laborie", name: "Laborie", mapImageId: "map14", demographics: { population: 7000, registeredVoters: 5800 }, pollingLocations: ["Laborie Boys' Primary"] },
    { id: "choiseul", name: "Choiseul", mapImageId: "map15", demographics: { population: 6500, registeredVoters: 5500 }, pollingLocations: ["Choiseul Secondary"] },
    { id: "soufriere", name: "Soufriere", mapImageId: "map16", demographics: { population: 7900, registeredVoters: 6200 }, pollingLocations: ["Soufriere Comprehensive"] },
    { id: "anse-la-raye", name: "Anse La Raye/Canaries", mapImageId: "map17", demographics: { population: 9500, registeredVoters: 7500 }, pollingLocations: ["Anse La Raye Primary", "Canaries Primary"] },
];

export const candidates: Candidate[] = [
  {
    id: 'allen-chastanet',
    name: 'Allen Chastanet',
    partyId: 'uwp',
    constituencyId: 'micoud-south',
    bio: 'Leader of the UWP and former Prime Minister of St. Lucia. Focuses on economic development and tourism.',
    imageId: 'candidate1',
    policyPositions: [
      { title: 'Economic Growth', description: 'Prioritizing foreign investment and large-scale infrastructure projects to boost the economy.' },
      { title: 'Tourism Development', description: 'Expanding the tourism sector with new hotels and attractions.' },
    ],
  },
  {
    id: 'philip-j-pierre',
    name: 'Philip J. Pierre',
    partyId: 'slp',
    constituencyId: 'castries-east',
    bio: 'Current Prime Minister of St. Lucia and leader of the SLP. Advocates for social programs and fiscal responsibility.',
    imageId: 'candidate2',
    policyPositions: [
      { title: 'Social Safety Nets', description: 'Strengthening programs to support vulnerable populations.' },
      { title: 'Fiscal Prudence', description: 'Managing national debt and ensuring sustainable government finances.' },
    ],
  },
  {
    id: 'guy-joseph',
    name: 'Guy Joseph',
    partyId: 'uwp',
    constituencyId: 'castries-south-east',
    bio: 'A senior member of the UWP, known for his work in infrastructure and public works.',
    imageId: 'candidate3',
    policyPositions: [
        { title: 'Infrastructure', description: 'Overseeing major road and utility projects.' },
        { title: 'Constituency Development', description: 'Focusing on local improvements.' },
    ],
  },
  {
    id: 'stephenson-king',
    name: 'Stephenson King',
    partyId: 'uwp', // Note: Historically has switched. Representing as UWP for this data.
    constituencyId: 'castries-north',
    bio: 'A veteran politician and former Prime Minister, with extensive experience in government.',
    imageId: 'candidate4',
    policyPositions: [
        { title: 'Governance Reform', description: 'Advocating for transparency and efficiency.' },
        { title: 'Senior Citizen Welfare', description: 'Championing causes for the elderly.' },
    ],
  },
  {
    id: 'kenny-anthony',
    name: 'Kenny Anthony',
    partyId: 'slp',
    constituencyId: 'vieux-fort-south',
    bio: 'Former Prime Minister and a towering figure in the SLP, with a background in law and education.',
    imageId: 'candidate5',
    policyPositions: [
        { title: 'Constitutional Reform', description: 'Leading discussions on updating the nation\'s constitution.' },
        { title: 'Education', description: 'Promoting access to quality education for all.' },
    ],
  },
];

export const polls: Poll[] = [
  {
    id: 'poll1',
    source: 'CADRES',
    date: '2025-11-15',
    results: [
      { partyId: 'slp', percentage: 48 },
      { partyId: 'uwp', percentage: 45 },
    ],
  },
  {
    id: 'poll2',
    source: 'BLAIS',
    date: '2026-01-20',
    results: [
      { partyId: 'slp', percentage: 47 },
      { partyId: 'uwp', percentage: 46 },
    ],
  },
  {
    id: 'poll3',
    source: 'CADRES',
    date: '2026-04-05',
    results: [
      { partyId: 'slp', percentage: 49 },
      { partyId: 'uwp', percentage: 44 },
    ],
  },
];

export const historicalResults: ElectionYearResult[] = [
    {
        year: 2021,
        summary: [
            { partyId: 'slp', seats: 13, totalVotes: 43799 },
            { partyId: 'uwp', seats: 2, totalVotes: 37481 },
        ],
        constituencyResults: [
            { constituencyId: 'gros-islet', candidateName: 'Kenson Casimir', partyId: 'slp', votes: 5462, isWinner: true },
            { constituencyId: 'babonneau', candidateName: 'Virginia Albert-Poyotte', partyId: 'slp', votes: 3998, isWinner: true },
            { constituencyId: 'micoud-south', candidateName: 'Allen Chastanet', partyId: 'uwp', votes: 2959, isWinner: true },
        ],
    },
    {
        year: 2016,
        summary: [
            { partyId: 'uwp', seats: 11, totalVotes: 46146 },
            { partyId: 'slp', seats: 6, totalVotes: 37947 },
        ],
        constituencyResults: [
            { constituencyId: 'gros-islet', candidateName: 'Lenard Montoute', partyId: 'uwp', votes: 6424, isWinner: true },
            { constituencyId: 'castries-east', candidateName: 'Philip J. Pierre', partyId: 'slp', votes: 3677, isWinner: true },
             { constituencyId: 'micoud-south', candidateName: 'Allen Chastanet', partyId: 'uwp', votes: 3266, isWinner: true },
        ],
    },
    {
        year: 1997,
        summary: [
            { partyId: 'slp', seats: 16, totalVotes: 44153 },
            { partyId: 'uwp', seats: 1, totalVotes: 26325 },
        ],
        constituencyResults: [
            { constituencyId: 'gros-islet', candidateName: 'Mario Michel', partyId: 'slp', votes: 4747, isWinner: true },
            { constituencyId: 'castries-central', candidateName: 'Sarah Flood-Beaubrun', partyId: 'slp', votes: 2795, isWinner: true },
            { constituencyId: 'micoud-south', candidateName: 'Louis George', partyId: 'uwp', votes: 1978, isWinner: true },
        ],
    },
    {
        year: 1974,
        summary: [
            { partyId: 'slp', seats: 7, totalVotes: 14436 },
            { partyId: 'uwp', seats: 10, totalVotes: 17300 },
        ],
        constituencyResults: [
            { constituencyId: 'castries-north-west', candidateName: 'John Compton', partyId: 'uwp', votes: 1, isWinner: true },
        ],
    },
];

export const getPartyById = (id: string) => parties.find(p => p.id === id);
export const getCandidateById = (id: string) => candidates.find(c => c.id === id);
export const getConstituencyById = (id: string) => constituencies.find(c => c.id === id);
