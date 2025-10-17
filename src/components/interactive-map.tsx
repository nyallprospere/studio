
'use client';

import { useRef, useState } from 'react';
import type { Constituency } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';

interface InteractiveMapProps {
  constituencies: Constituency[];
  onCoordinatesChange?: (id: string, coords: {top: string, left: string}) => void;
  onLeaningChange?: (id: string, newLeaning: string) => void;
  isDraggable?: boolean;
  isClickable?: boolean; // New prop to control click behavior
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
    onCoordinatesChange, 
    onLeaningChange,
    isDraggable,
    isClickable 
}: { 
    constituency: Constituency; 
    onCoordinatesChange?: InteractiveMapProps['onCoordinatesChange'],
    onLeaningChange?: InteractiveMapProps['onLeaningChange'],
    isDraggable?: boolean,
    isClickable?: boolean,
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: constituency.id,
        disabled: !isDraggable,
    });

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
      setIsPopoverOpen(false);
    }
    
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
                className={cn("p-1 rounded text-xs font-semibold text-white whitespace-nowrap", leaningClassName, !isDraggable && "hover:scale-110 transition-transform", isClickable && 'cursor-pointer')}
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
            <PopoverContent className="w-auto p-1">
              <div className="flex flex-col gap-1">
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
            <PopoverContent className="w-64">
                <div className="space-y-4">
                    <h4 className="font-semibold leading-none">{constituency.name}</h4>
                    <div className="flex items-center text-sm">
                        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>{constituency.demographics?.registeredVoters?.toLocaleString() || 'N/A'} Voters</span>
                    </div>
                    <Button asChild size="sm" className="w-full">
                        <Link href={`/constituencies/${constituency.id}`}>
                            View Details
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function InteractiveMap({ constituencies, onCoordinatesChange, onLeaningChange, isDraggable = false }: InteractiveMapProps) {
  const { firestore } = useFirebase();
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: siteSettings, isLoading: loadingSettings } = useDoc(settingsRef);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const isClickable = !isDraggable && !!onLeaningChange;

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
                    onCoordinatesChange={onCoordinatesChange}
                    onLeaningChange={onLeaningChange}
                    isDraggable={isDraggable}
                    isClickable={isClickable}
                />
            ))}
        </div>
    </DndContext>
  );
}
