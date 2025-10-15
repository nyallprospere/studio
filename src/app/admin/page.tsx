'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Shield, Users, BarChart3, Landmark, Map, FilePlus, GripVertical } from 'lucide-react';
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

const initialAdminSections = [
    { id: 'parties', title: 'Manage Parties', href: '/admin/parties', icon: Shield },
    { id: 'candidates', title: 'Manage Candidates', href: '/admin/candidates', icon: Users },
    { id: 'polls', title: 'Manage Polling Data', href: '/admin/polls', icon: BarChart3 },
    { id: 'results', title: 'Manage Election Results', href: '/admin/results', icon: Landmark },
    { id: 'constituencies', title: 'Manage Constituencies', href: '/admin/constituencies', icon: FilePlus },
    { id: 'map', title: 'Manage Map', href: '/admin/map', icon: Map },
];

function SortableAdminSection({ section }: { section: typeof initialAdminSections[0] }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div {...listeners} className="cursor-grab p-2">
                             <GripVertical className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="font-headline">{section.title}</CardTitle>
                    </div>
                    <section.icon className="w-6 h-6 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href={section.href}>Go to section</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AdminDashboardPage() {
  const [adminSections, setAdminSections] = useState(initialAdminSections);
  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      setAdminSections((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Admin Dashboard"
        description="Manage the content for LucianVotes."
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={adminSections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {adminSections.map(section => (
                <SortableAdminSection key={section.id} section={section} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
