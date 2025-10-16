'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, BarChart3, TrendingUp, Landmark, Shield, Vote, Map, GripVertical, FilePlus, Settings } from 'lucide-react';
import Countdown from '@/components/countdown';
import { PageHeader } from '@/components/page-header';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUser } from '@/firebase';

const initialKeyFeatures = [
    {
      id: 'candidates',
      title: 'Candidate Profiles',
      description: 'Learn about the candidates and their platforms.',
      icon: Users,
      href: '/candidates',
    },
    {
      id: 'polls',
      title: 'Polling Data',
      description: 'View the latest poll results and trends.',
      icon: BarChart3,
      href: '/polls',
    },
    {
      id: 'predictions',
      title: 'AI Predictions',
      description: 'See our AI-powered election outcome predictions.',
      icon: TrendingUp,
      href: '/predictions',
    },
    {
      id: 'results',
      title: 'Past Results',
      description: 'Explore historical election data from 1974.',
      icon: Landmark,
      href: '/results',
    },
     {
      id: 'parties',
      title: 'Party Information',
      description: 'Discover the parties contesting the election.',
      icon: Shield,
      href: '/parties',
    },
    {
      id: 'constituencies',
      title: 'Constituencies',
      description: 'Find your constituency and its voting information.',
      icon: Map,
      href: '/constituencies',
    },
];

const adminSections = [
    { id: 'admin-elections', title: 'Manage Elections', href: '/admin/elections', icon: Vote },
    { id: 'admin-parties', title: 'Manage Parties', href: '/admin/parties', icon: Shield },
    { id: 'admin-candidates', title: 'Manage Candidates', href: '/admin/candidates', icon: Users },
    { id: 'admin-results', title: 'Manage Election Results', href: '/admin/results', icon: Landmark },
    { id: 'admin-constituencies', title: 'Manage Constituencies', href: '/admin/constituencies', icon: FilePlus },
    { id: 'admin-map', title: 'Manage Map', href: '/admin/map', icon: Map },
    { id: 'admin-settings', title: 'Manage Settings', href: '/admin/settings', icon: Settings },
];


function SortableFeatureCard({ feature }: { feature: typeof initialKeyFeatures[0] }) {
  const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
  } = useSortable({ id: feature.id });

  const style = {
      transform: CSS.Transform.toString(transform),
      transition,
  };

  return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <Card className="flex flex-col hover:shadow-xl transition-shadow duration-300 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <div {...listeners} className="cursor-grab p-2">
                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                    </div>
                     <div className="flex items-center gap-4">
                        <feature.icon className="w-8 h-8 text-primary" />
                        <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-primary hover:bg-primary/90">
                <Link href={feature.href}>View Details</Link>
              </Button>
            </CardFooter>
          </Card>
      </div>
  );
}


export default function Home() {
  const { user } = useUser();
  const electionDate = new Date('2026-07-26T00:00:00');
  const [keyFeatures, setKeyFeatures] = useState(initialKeyFeatures);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      setKeyFeatures((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="LucianVotes"
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
      
       <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={keyFeatures.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {keyFeatures.map((feature) => (
                    <SortableFeatureCard key={feature.id} feature={feature} />
                ))}
            </div>
        </SortableContext>
      </DndContext>

      {user && (
          <div className="mt-12">
            <PageHeader
                title="Admin Dashboard"
                description="Manage the content for LucianVotes."
            />
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {adminSections.map((section) => (
                    <Card key={section.id}>
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
      )}


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
