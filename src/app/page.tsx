import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, BarChart3, TrendingUp, Landmark, Shield, Vote, Map } from 'lucide-react';
import Countdown from '@/components/countdown';
import { PageHeader } from '@/components/page-header';

export default function Home() {
  const electionDate = new Date('2026-07-26T00:00:00');

  const keyFeatures = [
    {
      title: 'Candidate Profiles',
      description: 'Learn about the candidates and their platforms.',
      icon: <Users className="w-8 h-8 text-primary" />,
      href: '/candidates',
    },
    {
      title: 'Polling Data',
      description: 'View the latest poll results and trends.',
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      href: '/polls',
    },
    {
      title: 'AI Predictions',
      description: 'See our AI-powered election outcome predictions.',
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      href: '/predictions',
    },
    {
      title: 'Past Results',
      description: 'Explore historical election data from 1974.',
      icon: <Landmark className="w-8 h-8 text-primary" />,
      href: '/results',
    },
     {
      title: 'Party Information',
      description: 'Discover the parties contesting the election.',
      icon: <Shield className="w-8 h-8 text-primary" />,
      href: '/admin/parties',
    },
    {
      title: 'Constituencies',
      description: 'Find your constituency and its voting information.',
      icon: <Map className="w-8 h-8 text-primary" />,
      href: '/constituencies',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="St. Lucia Elections Hub"
        description="Your comprehensive guide to the 2026 General Elections."
      />

      <Card className="mb-8 bg-card shadow-lg border-primary/20">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-headline md:text-3xl text-primary">
            Countdown to Election Day 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Countdown date={electionDate} />
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {keyFeatures.map((feature) => (
          <Card key={feature.title} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center gap-4">
              {feature.icon}
              <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button asChild className="w-full bg-primary hover:bg-primary/90">
                <Link href={feature.href}>View Details</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
       <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Vote /> Voter Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Key Dates & Deadlines</h3>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>Voter Registration Deadline: TBD</li>
                <li>Advance Polling Day: TBD</li>
                <li>General Election Day: July 26, 2026 (Tentative)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Voter Requirements</h3>
              <p className="text-muted-foreground">To be eligible to vote, you must be a citizen of St. Lucia, 18 years of age or older, and registered to vote in your constituency.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
