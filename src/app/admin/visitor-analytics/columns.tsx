'use client';

import { ColumnDef } from '@tanstack/react-table';
import { PageView } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const getColumns = (): ColumnDef<PageView>[] => [
  {
    accessorKey: 'timestamp',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Timestamp
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.original.timestamp?.toDate();
      return date ? format(date, 'PPpp') : 'N/A';
    },
  },
  {
    accessorKey: 'path',
    header: 'Page Path',
  },
  {
    accessorKey: 'city',
    header: 'City',
  },
  {
    accessorKey: 'country',
    header: 'Country',
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP Address',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.ipAddress}</span>,
  },
  {
    accessorKey: 'sessionId',
    header: 'Session ID',
  },
];
