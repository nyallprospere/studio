
'use client';

import { useState } from 'react';
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';
import Image from 'next/image';

interface DraggableImageProps {
  imageUrl: string;
}

function DraggableImage({ imageUrl }: DraggableImageProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'draggable-image-overlay',
  });
  
  const style = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    touchAction: 'none', // To prevent scrolling on touch devices
  };
  
  const draggingStyle = transform ? {
     transform: `translate3d(${position.x + transform.x}px, ${position.y + transform.y}px, 0)`,
     touchAction: 'none',
  } : style;


  return (
    <div 
        ref={setNodeRef} 
        style={draggingStyle} 
        {...listeners} 
        {...attributes}
        className="absolute z-10 cursor-grab active:cursor-grabbing"
    >
        <Image src={imageUrl} alt="Draggable Overlay" width={150} height={150} className="pointer-events-none" />
    </div>
  );
}


export function DraggableImageOverlay({ imageUrl }: DraggableImageProps) {
    const [position, setPosition] = useState({ x: 50, y: 50 });

    const handleDragEnd = (event: DragEndEvent) => {
        const { delta } = event;
        setPosition(prev => ({
            x: prev.x + delta.x,
            y: prev.y + delta.y,
        }));
    };
    
    // This is a simplified version. For a real component, you'd want to manage state and context more robustly.
    // We are creating a simple self-contained draggable item here.
     const [isClient, setIsClient] = useState(false);
    
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null;
    }


    return (
        <DndContext onDragEnd={handleDragEnd}>
             <div 
                style={{
                    position: 'absolute',
                    top: position.y,
                    left: position.x,
                    touchAction: 'none',
                }}
                className="z-10"
            >
                <DraggableItem imageUrl={imageUrl} />
            </div>
        </DndContext>
    );
}


function DraggableItem({imageUrl}: {imageUrl: string}) {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: 'draggable-overlay',
  });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <Image src={imageUrl} alt="Draggable Overlay" width={150} height={150} className="pointer-events-none" />
    </div>
  );
}
