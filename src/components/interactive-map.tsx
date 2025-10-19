

'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import type { Constituency } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';
import { Input } from './ui/input';
import { PieChart, Pie, Cell } from 'recharts';
import { Label } from './ui/label';
import { MapPin } from 'lucide-react';
import { ConstituencyPopoverContent } from './constituency-popover-content';

interface InteractiveMapProps {
  constituencies: Constituency[];
  onCoordinatesChange?: (id: string, coords: {top: string, left: string}) => void;
  onLeaningChange?: (id: string, newLeaning: string) => void;
  onPredictionChange?: (id: string, slp: number, uwp: number) => void;
  isDraggable?: boolean;
  isClickable?: boolean;
}

const politicalLeaningOptions = [
  { value: 'solid-uwp', label: 'Solid UWP', color: 'bg-yellow-500' },
  { value: 'lean-uwp', label: 'Lean UWP', color: 'bg-yellow-300' },
  { value: 'tossup', label: 'Tossup', color: 'bg-purple-500' },
  { value: 'lean-slp', label: 'Lean SLP', color: 'bg-red-400' },
  { value: 'solid-slp', label: 'Solid SLP', color: 'bg-red-700' },
];

const getLeaningInfo = (leaning: string | undefined) => {
    const defaultLeaning = politicalLeaningOptions.find(o => o.value === 'tossup')!;
    const leaningInfo = politicalLeaningOptions.find(o => o.value === leaning) || defaultLeaning;
    return { className: leaningInfo.color };
}

function DraggableConstituency({ 
    constituency, 
    isDraggable,
    isClickable,
    onLeaningChange,
    onPredictionChange,
}: { 
    constituency: Constituency; 
    isDraggable?: boolean,
    isClickable?: boolean,
    onLeaningChange?: InteractiveMapProps['onLeaningChange'],
    onPredictionChange?: InteractiveMapProps['onPredictionChange'],
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: constituency.id,
        disabled: !isDraggable,
    });

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    
    const [slpPercentage, setSlpPercentage] = useState(constituency.predictedSlpPercentage || 50);
    const [uwpPercentage, setUwpPercentage] = useState(constituency.predictedUwpPercentage || 50);

    useEffect(() => {
        setSlpPercentage(constituency.predictedSlpPercentage || 50);
        setUwpPercentage(constituency.predictedUwpPercentage || 50);
    }, [constituency]);
    
    const chartData = useMemo(() => [
      { name: 'SLP', value: slpPercentage, color: '#E74C3C' },
      { name: 'UWP', value: uwpPercentage, color: '#F1C40F' },
    ], [slpPercentage, uwpPercentage]);

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
    } : undefined;

    const coords = constituency.mapCoordinates;
    if (!coords || !coords.top || !coords.left) {
        return null;
    }
    
    const { className: leaningClassName } = getLeaningInfo(constituency.politicalLeaning);

    const handleLeaningSelect = (newLeaning: string) => {
      if (onLeaningChange) {
        onLeaningChange(constituency.id, newLeaning);
      }
    }

    const handlePredictionChange = (party: 'slp' | 'uwp', value: string) => {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

      let newSlp: number;
      let newUwp: number;

      if (party === 'slp') {
        newSlp = numValue;
        newUwp = 100 - numValue;
      } else {
        newUwp = numValue;
        newSlp = 100 - numValue;
      }
      
      setSlpPercentage(newSlp);
      setUwpPercentage(newUwp);

      if (onPredictionChange) {
        onPredictionChange(constituency.id, newSlp, newUwp);
      }
    };
    
    const OverlayButton = (
        <div 
            ref={setNodeRef}
            style={{ top: `${coords.top}%`, left: `${coords.left}%`, ...style }}
            className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2",
                isDraggable && 'cursor-grab active:cursor-grabbing',
            )}
            {...(isDraggable ? listeners : {})} 
            {...(isDraggable ? attributes : {})}
        >
            <div 
                className={cn("p-1 rounded-sm text-[10px] font-semibold text-white whitespace-nowrap", leaningClassName, !isDraggable && "hover:scale-110 transition-transform", isClickable && 'cursor-pointer')}
                aria-label={`Info for ${constituency.name}`}
            >
                {constituency.name}
            </div>
        </div>
    );

    // Clickable behavior for admin: shows a popover to select leaning
    if (isClickable) {
      return (
         <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              {OverlayButton}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex flex-col gap-2">
                <h4 className="font-medium text-sm px-2 pt-1">{constituency.name}</h4>
                {politicalLeaningOptions.map(opt => (
                  <Button 
                    key={opt.value}
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => handleLeaningSelect(opt.value)}
                  >
                     <span className={cn("w-3 h-3 rounded-full mr-2", opt.color)}></span>
                     {opt.label}
                  </Button>
                ))}
                 <div className="border-t my-2"></div>

                  <div className="w-48 mx-auto relative h-24">
                      <PieChart width={192} height={96}>
                          <Pie
                              data={chartData}
                              cx="50%"
                              cy="100%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius="60%"
                              outerRadius="100%"
                              dataKey="value"
                              paddingAngle={2}
                          >
                              {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Pie>
                      </PieChart>
                  </div>
                 
                 <div className="space-y-2">
                    <div>
                      <Label htmlFor="slp-pred">Predicted SLP %</Label>
                      <Input id="slp-pred" type="number" value={slpPercentage} onChange={e => handlePredictionChange('slp', e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="uwp-pred">Predicted UWP %</Label>
                      <Input id="uwp-pred" type="number" value={uwpPercentage} onChange={e => handlePredictionChange('uwp', e.target.value)} />
                    </div>
                  </div>

              </div>
            </PopoverContent>
          </Popover>
      )
    }

    // Default behavior for public pages: shows an info popover
    return (
        <Popover>
            <PopoverTrigger asChild>
                {OverlayButton}
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <ConstituencyPopoverContent constituency={constituency} />
            </PopoverContent>
        </Popover>
    );
}

export function InteractiveMap({ constituencies, onCoordinatesChange, onLeaningChange, onPredictionChange, isDraggable = false }: InteractiveMapProps) {
  const { firestore } = useFirebase();
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: siteSettings, isLoading: loadingSettings } = useDoc(settingsRef);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const isClickable = !isDraggable && (!!onLeaningChange || !!onPredictionChange);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onCoordinatesChange || !mapContainerRef.current) return;
    
    const { active, delta } = event;
    const constituencyId = active.id as string;
    
    const constituency = constituencies.find(c => c.id === constituencyId);
    if (!constituency || !constituency.mapCoordinates) return;
    
    const mapRect = mapContainerRef.current.getBoundingClientRect();
    
    const currentTop = parseFloat(constituency.mapCoordinates.top);
    const currentLeft = parseFloat(constituency.mapCoordinates.left);
    
    const newTop = currentTop + (delta.y / mapRect.height) * 100;
    const newLeft = currentLeft + (delta.x / mapRect.width) * 100;

    onCoordinatesChange(constituencyId, {
      top: newTop.toFixed(2),
      left: newLeft.toFixed(2),
    });
  };

  if (loadingSettings) {
    return <Skeleton className="w-full h-[70vh]" />;
  }

  if (!siteSettings?.mapUrl) {
    return (
        <div className="w-full h-96 flex flex-col items-center justify-center bg-muted rounded-lg">
            <MapPin className="w-12 h-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No map has been uploaded yet.</p>
            <p className="text-xs text-muted-foreground">Admins can upload a map from the 'Manage Map' page.</p>
        </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
        <div ref={mapContainerRef} className="w-full relative aspect-[4/5]">
            <Image 
                src={siteSettings.mapUrl} 
                alt="Constituency Map of St. Lucia" 
                fill
                className="object-contain"
                priority
            />
            {constituencies.map(c => (
                <DraggableConstituency
                    key={c.id}
                    constituency={c}
                    onLeaningChange={onLeaningChange}
                    onPredictionChange={onPredictionChange}
                    isDraggable={isDraggable}
                    isClickable={isClickable}
                />
            ))}
        </div>
    </DndContext>
  );
}
