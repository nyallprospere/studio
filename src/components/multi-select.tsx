
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export type OptionType = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
  children?: React.ReactNode;
}

function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'Select options',
  children,
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };
  
  const getLabel = () => {
    if (placeholder?.includes('elections')) {
        return selected.length === 1 ? 'year' : 'years';
    }
    if (placeholder?.includes('constituencies')) {
        return selected.length === 1 ? 'constituency' : 'constituencies';
    }
    return 'items';
  }

  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length > 0 ? (
               <span className="text-sm">
                {selected.length} {getLabel()} selected
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command className={className}>
            {children}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect };
