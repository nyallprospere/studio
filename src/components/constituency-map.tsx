'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StLuciaMap } from '@/components/icons/st-lucia-map';
import type { Constituency } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConstituencyMapProps {
  constituencies: Constituency[];
}

export function ConstituencyMap({ constituencies }: ConstituencyMapProps) {
  const [hoveredConstituency, setHoveredConstituency] = useState<Constituency | null>(null);
  const router = useRouter();

  const handleConstituencyClick = (constituencyId: string) => {
    const constituency = constituencies.find(c => c.id === constituencyId);
    if (constituency) {
      router.push(`/constituencies/${constituency.id}`);
    }
  };

  const handleMouseEnter = (constituencyId: string) => {
    const constituency = constituencies.find(c => c.id === constituencyId);
    setHoveredConstituency(constituency || null);
  };

  const handleMouseLeave = () => {
    setHoveredConstituency(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-2">
            <StLuciaMap
              onClick={handleConstituencyClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              hoveredId={hoveredConstituency?.id}
            />
          </CardContent>
        </Card>
      </div>
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="font-headline">Constituency Info</CardTitle>
          </CardHeader>
          <CardContent>
            {hoveredConstituency ? (
              <div>
                <h3 className="text-lg font-semibold">{hoveredConstituency.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Population: {hoveredConstituency.demographics.population.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Registered Voters: {hoveredConstituency.demographics.registeredVoters.toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Hover over a constituency on the map to see details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
