
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import Link from 'next/link';

type Feature = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
};

export function SortableFeatureCard({ feature }: { feature: Feature }) {
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

    