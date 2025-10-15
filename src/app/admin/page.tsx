import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Shield, Users, BarChart3, Landmark, Map, KeyRound } from 'lucide-react';

const adminSections = [
    { title: 'Manage Parties', href: '/admin/parties', icon: Shield },
    { title: 'Manage Candidates', href: '/admin/candidates', icon: Users },
    { title: 'Manage Polling Data', href: '/admin/polls', icon: BarChart3 },
    { title: 'Manage Election Results', href: '/admin/results', icon: Landmark },
    { title: 'Manage Constituencies', href: '/admin/constituencies', icon: Map },
    { title: 'Manage API Keys', href: '/admin/apikeys', icon: KeyRound },
];

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Admin Dashboard"
        description="Manage the content for LucianVotes."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map(section => (
            <Card key={section.href}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-headline">{section.title}</CardTitle>
                    <section.icon className="w-6 h-6 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href={section.href}>Go to section</Link>
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
