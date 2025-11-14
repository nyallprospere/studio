
export type NavItem = {
  label: string;
  href: string;
  match?: 'exact' | 'prefix';
};

export const mainNavItems: NavItem[] = [
  { label: 'Our Projections', href: '/our-projections' },
  { label: 'Make Your Own', href: '/make-your-own' },
  { label: 'News', href: '/election-news' },
  { label: 'Historical Trends', href: '/historical-trends' },
];

export const adminNavItems: NavItem[] = [
  { label: 'Parties', href: '/admin/parties' },
  { label: 'Candidates', href: '/admin/candidates' },
  { label: 'Elections', href: '/admin/elections' },
  { label: 'Constituencies', href: '/admin/constituencies' },
  { label: 'Regions', href: '/admin/regions' },
  { label: 'Election Results', href: '/admin/results' },
  { label: 'Events', href: '/admin/events' },
  { label: 'News', href: '/admin/news' },
  { label: 'Logos', href: '/admin/logos' },
  { label: 'Map Submissions', href: '/admin/map-submissions'},
  { label: 'Ads', href: '/admin/ads' },
  { label: 'Ad Analytics', href: '/admin/analytics'},
  { label: 'Visitor Analytics', href: '/admin/visitor-analytics' },
  { label: 'Mailing List', href: '/admin/mailing-list'},
  { label: 'AI Analyzer', href: '/admin/ai-analyzer' },
  { label: 'Voter Information', href: '/admin/voter-information'},
  { label: 'Countdown', href: '/admin/countdown' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Test Upload', href: '/admin/test-upload' },
];
