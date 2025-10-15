
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
    "Gros Islet": "M50.4,5.4L55.5,5.3L55.8,6.8L59.1,7.2L61.1,9.3L61.4,11.5L62.7,13L63.8,14.7L62.1,16.2L60.9,15.6L57.5,16.5L54.2,18.2L51.9,17.9L50.7,18.4L49.3,20.5L48.1,20.5L46.8,19L46.4,16.5L45.4,15.1L45.6,13.2L46.1,11.7L46.7,10.1L48.2,7.9L50.4,5.4Z",
    "Castries North": "M46.7,21.5L48,21.9L49.3,20.6L50.7,18.5L51.9,18L54.2,18.3L57.5,16.6L60.9,15.7L62.1,16.3L63.8,14.8L65.1,15.3L66.7,16.6L68.8,17L70.1,18.4L70.5,20.4L71.5,21.7L71.9,23.3L71.3,25.2L70,26.4L68.3,26.5L66.5,27.8L64.8,28.2L62.9,28.2L61.1,29.1L59.4,28.7L57.5,29.3L55.7,31.2L53.9,31.2L52.1,30.3L50.7,30.9L49.1,30.1L47.9,30.5L46.7,29.4L45.9,27.2L46.7,21.5Z",
    "Babonneau": "M46.3,16.4L46.7,19L48,20.4L49.2,20.4L46.6,21.4L45.8,27.1L46.6,29.3L47.8,30.4L49,30L50.6,30.8L52,30.2L53.8,31.1L55.6,31.1L57.4,29.2L59.3,28.6L61,29L62.8,28.1L64.7,28.1L66.4,27.7L68.2,26.4L69.9,26.3L71.2,25.1L71.8,23.2L71.4,21.6L70.4,20.3L70,18.3L68.7,16.9L66.6,16.5L65,15.2L64.4,18.1L63.8,20.7L62.3,23.1L60.3,25.1L58,26.6L55.6,27.3L53.2,27.3L51.3,26.2L49.5,25.7L48.2,23.8L47.2,22.1L46.3,16.4Z",
    "Castries Central": "M48.2,31.1L49.2,31.6L50.8,31L52.2,30.4L54,31.3L55.8,31.3L57,32.7L57.9,34.5L56.9,36.1L55.6,36.1L53.8,37.3L51.9,38.5L50.7,38.1L49.5,36.5L48.2,34.9L48.2,31.1Z",
    "Castries East": "M57.9,34.6L57,32.8L55.9,31.4L57.6,29.4L59.5,28.8L61.2,29.2L63,28.3L64.9,28.3L66.6,27.8L68.4,26.6L70.1,26.5L71.4,27.9L72.4,29.7L72.2,31.5L71,32.9L70,34.4L68.4,35.6L66.8,36.3L65.1,36.3L63,35.3L61,35.7L59.2,35.1L57.9,34.6Z",
    "Castries South East": "M63.1,35.4L65.2,36.4L66.9,36.4L68.5,35.7L70.1,34.5L71.1,33L72.3,31.6L72.5,34.1L73,36.5L74.9,38.3L75.9,40.4L75.5,42.5L74.1,44.2L72.3,45.4L70.6,46.3L68.8,46.3L67.1,45L65.3,43.4L63.8,41.4L62.7,39.1L62.9,37.1L63.1,35.4Z",
    "Castries South": "M48.3,35L49.6,36.6L50.8,38.2L52,38.6L53.9,37.4L55.7,36.2L57,36.2L57.3,38.2L56.8,40L55.4,41.7L53.9,42.7L52.2,42.7L50.7,41.5L49,40.1L47.5,38.5L47.9,36.5L48.3,35Z",
    "Anse La Raye/Canaries": "M47.4,38.6L48.9,40.2L50.6,41.6L52.1,42.8L53.8,42.8L55.3,41.8L56.7,40.1L57.2,38.3L56.9,36.3L57.8,34.7L59.1,35.2L60.9,35.8L62.9,35.5L62.8,37.2L62.6,39.2L63.7,41.5L65.2,43.5L67,45.1L68.7,46.4L70.5,46.4L71.5,47.7L70.7,49.6L69.2,51.1L67.5,52.1L65.8,52.1L64.2,50.8L62.7,49.1L61,48L59.2,48.2L57.4,49.6L55.7,50.9L53.9,51.5L51.8,51.5L50.1,50.1L48.2,49.9L46.4,51.3L44.8,50.4L43.8,48.5L43.8,46.4L44.6,44.4L45.9,42.2L47.4,38.6Z",
    "Soufriere": "M43.7,48.6L44.7,50.5L46.3,51.4L48.1,50L50,50.2L51.7,51.6L53.8,51.6L55.6,51L57.3,49.7L59.1,48.3L60.9,48.1L62.6,49.2L64.1,50.9L65.7,52.2L66.6,53.8L66.6,55.9L65.6,57.6L64.1,58.9L62.3,59.8L60.6,59.8L59,58.6L57.1,57.7L55.4,58.3L53.5,59.6L51.8,60.2L50,60.2L48.1,59L46.3,58L44.7,58.6L43,60L41.6,60.6L40.1,60.1L38.6,58.6L37.5,56.7L37.7,54.7L38.9,52.8L40.7,50.9L42.4,49.3L43.7,48.6Z",
    "Choiseul": "M37.6,56.8L38.7,58.7L40.2,60.2L41.7,60.7L43.1,60.1L44.8,58.7L46.4,58.1L48.2,59.1L50.1,60.3L51.9,60.3L53.6,59.7L55.5,58.4L57.2,57.8L59.1,58.7L60.7,59.9L61.5,61.4L61.1,63.2L59.9,64.6L58.3,65.5L56.6,65.5L55,64.4L53.2,63.6L51.3,63.6L49.6,64.8L48,65.9L46.3,65.9L44.7,64.8L43.1,63.5L41.5,62.5L40,62.5L38.3,63.9L36.9,63.2L35.7,61.7L35.9,59.7L36.8,58L37.6,56.8Z",
    "Laborie": "M60.8,61.5L60.8,59.9L59.2,58.8L57.3,57.9L55.6,58.5L53.7,59.8L51.9,60.4L51.4,63.7L53.3,63.7L55.1,64.5L56.7,65.6L58.4,65.6L60,64.7L61.2,63.3L60.8,61.5Z",
    "Vieux Fort South": "M56.5,65.7L58.2,65.7L59.8,64.8L61,63.4L61.4,64.9L62.2,66.4L63.2,67.8L64.2,69.1L63.4,70.6L62.1,71.7L60.6,72.2L59,71.5L57.6,70.1L56.1,68.6L56.5,65.7Z",
    "Vieux Fort North": "M61.3,63.1L61.1,61.4L61.4,60L59,58.6L60.6,59.8L62.3,59.7L64,58.8L65.5,57.5L66.5,55.8L66.5,53.7L67.4,52.2L69.1,51L70.6,49.5L71.4,47.6L72.2,45.3L74,44.1L75.4,42.4L75.8,40.3L74.8,38.2L72.9,36.4L73.3,38.6L74,40.8L74.9,42.7L75.7,44.7L76.1,46.8L75.1,48.7L73.7,50.5L72,52L70.4,53.4L69.4,55.2L69.4,57.2L69.9,59.1L70.4,60.9L69.5,62.8L68.1,64.4L66.6,65.6L65,66.9L63.3,67.7L62.1,66.3L61.3,64.8L61.3,63.1Z",
    "Micoud South": "M64.9,66.8L66.5,65.5L68,64.3L69.4,62.7L70.3,60.8L69.8,59L69.3,57.1L69.3,55.1L70.3,53.3L71.9,51.9L73.6,50.4L75,48.6L76,46.7L75.6,44.6L74.8,42.6L73.9,40.7L73.2,38.5L74.8,40.4L75.7,42.3L76.7,44.3L77.7,46.4L78.3,48.5L78.9,50.6L78.5,52.8L77.5,54.8L76.2,56.6L74.8,58.2L73.2,59.7L71.8,61.1L70.4,62.5L68.9,63.9L67.5,65.2L66.2,66.3L64.9,66.8Z",
    "Micoud North": "M70.5,46.2L72.2,45.3L74,44L75.4,42.3L75.8,40.2L74.8,38.1L72.9,36.3L73.2,34L72.4,29.6L72.9,27.5L74,26.1L75.5,25.4L77.2,25.9L78.7,27.5L79.3,29.5L79,31.5L79.5,33.7L80.1,35.8L80.1,38L79.4,40.1L78.3,42.1L77.7,44.2L78.2,46.3L78.8,48.4L78.4,50.5L78.8,52.7L77.4,54.7L76.1,56.5L74.7,58.1L73.1,59.6L71.7,61L70.3,62.4L68.8,63.8L67.4,65.1L66.1,66.2L65.2,66.8L63.2,67.6L64.9,66.7L66.5,65.4L67.9,64.2L69.3,62.6L70.2,60.7L69.7,58.9L69.2,57L69.2,55L70.2,53.2L70.2,51.1L70.5,48.9L70.5,46.2Z",
    "Dennery South": "M72.8,27.6L72.3,29.7L72.8,31.6L73.1,33.9L72.8,36.2L74.8,38L75.8,40.1L75.4,42.2L74,43.9L72.2,45.2L70.4,46.1L68.7,46.1L67,44.9L65.2,43.3L63.7,41.3L62.6,39L62.8,37L63,35.3L64.5,33.2L65.9,31.3L67.2,29.8L68.6,28.7L70.1,28.2L71.6,28.2L72.8,27.6Z",
    "Dennery North": "M72.7,27.5L71.5,28.1L70,28.1L68.5,28.6L67.1,29.7L65.8,31.2L64.4,33.1L62.9,35.4L62.7,37.1L62.5,39.1L63.6,41.4L65.1,43.4L66.9,45L68.6,46.3L70.3,46.3L72.1,45.3L73.9,44.1L75.3,42.4L75.7,40.3L74.7,38.2L72.8,36.4L73.1,34.1L72.7,31.7L72.2,29.7L72.7,27.5Z"
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
      <svg viewBox="0 0 100 80" className="w-full h-auto max-w-2xl">
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
