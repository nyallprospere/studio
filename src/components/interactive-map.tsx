
'use client';

import { useState } from 'react';
import type { Constituency } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface InteractiveMapProps {
  constituencies: Constituency[];
}

// In a real application, these paths would come from a CMS or a dedicated file.
const constituencyPaths: { [key: string]: string } = {
    'Gros Islet': "M110 5 L125 5 L130 20 L120 30 L110 25 Z",
    'Castries North': "M110 28 L120 33 L125 45 L115 50 L105 40 Z",
    'Babonneau': "M90 15 L108 10 L108 28 L95 35 Z",
    'Castries Central': "M105 43 L115 52 L110 60 L100 55 Z",
    'Castries East': "M117 53 L125 47 L130 55 L120 62 Z",
    'Castries South East': "M112 63 L122 65 L125 75 L115 80 L110 70 Z",
    'Castries South': "M100 58 L110 62 L108 70 L98 65 Z",
    'Anse La Raye/Canaries': "M80 50 L97 60 L95 75 L80 70 Z",
    'Soufriere': "M65 70 L80 75 L75 90 L60 85 Z",
    'Choiseul': "M50 88 L60 90 L55 105 L45 100 Z",
    'Laborie': "M65 92 L75 95 L70 110 L60 108 Z",
    'Vieux Fort South': "M75 115 L85 118 L80 130 L70 125 Z",
    'Vieux Fort North': "M88 105 L100 108 L95 120 L85 115 Z",
    'Micoud South': "M102 100 L115 105 L110 120 L100 115 Z",
    'Micoud North': "M117 85 L128 90 L122 105 L112 100 Z",
    'Dennery South': "M124 77 L130 80 L128 90 L120 86 Z",
    'Dennery North': "M127 60 L135 65 L132 78 L125 74 Z",
};

export function InteractiveMap({ constituencies }: InteractiveMapProps) {
  const [popoverState, setPopoverState] = useState<{ [key: string]: boolean }>({});
  const [activeConstituency, setActiveConstituency] = useState<Constituency | null>(null);

  const getConstituencyByName = (name: string) => {
    return constituencies.find(c => c.name === name);
  };
  
  const handleConstituencyClick = (name: string) => {
    const constituency = getConstituencyByName(name);
    if (constituency) {
      setActiveConstituency(constituency);
      setPopoverState(prev => ({ ...Object.fromEntries(Object.keys(prev).map(k => [k, false])), [name]: true }));
    }
  };

  const handleOpenChange = (name: string, open: boolean) => {
    setPopoverState(prev => ({...prev, [name]: open }));
    if (!open) {
      setActiveConstituency(null);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 150 140" className="w-full h-auto max-w-2xl">
        <g>
          {Object.entries(constituencyPaths).map(([name, pathData]) => {
            const constituency = getConstituencyByName(name);
            const isClickable = !!constituency;
            
            return (
              <Popover key={name} open={popoverState[name]} onOpenChange={(open) => handleOpenChange(name, open)}>
                <PopoverTrigger asChild>
                  <path
                    d={pathData}
                    onClick={isClickable ? () => handleConstituencyClick(name) : undefined}
                    className={`stroke-background stroke-2 transition-all duration-300 ${
                      isClickable 
                        ? 'fill-primary/50 hover:fill-primary/80 cursor-pointer' 
                        : 'fill-muted cursor-not-allowed'
                    } ${ activeConstituency?.name === name ? 'fill-accent' : ''}`}
                  />
                </PopoverTrigger>
                {constituency && (
                   <PopoverContent>
                      <div className="space-y-4">
                        <h4 className="font-bold font-headline">{constituency.name}</h4>
                        <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            <span className="font-semibold mr-2">Voters:</span>
                            <span>{constituency.demographics.registeredVoters.toLocaleString()}</span>
                        </div>
                        <Button asChild size="sm" className="w-full">
                            <Link href={`/constituencies/${constituency.id}`}>
                                View Details <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                      </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
