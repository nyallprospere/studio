'use client';

import { ColumnDef } from '@tanstack/react-table';
import { UserMap } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const getSeatCountsFromMapData = (mapData: UserMap['mapData']) => {
  let slp = 0,
    uwp = 0,
    ind = 0;
  mapData.forEach((item) => {
    if (item.politicalLeaning === 'slp') slp++;
    else if (item.politicalLeaning === 'uwp') uwp++;
    else if (item.politicalLeaning === 'ind') ind++;
  });
  return { slp, uwp, ind };
};

export const getColumns = (
  onDelete: (map: UserMap) => void
): ColumnDef<UserMap>[] => [
  {
    accessorKey: 'imageUrl',
    header: 'Map',
    cell: ({ row }) => {
      const map = row.original;
      return (
        <Link href={`/maps/${map.id}`}>
          <div className="relative aspect-video w-32 bg-muted rounded-md overflow-hidden">
            {map.imageUrl ? (
              <Image
                src={map.imageUrl}
                alt="User created map"
                fill
                className="object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                No Image
              </div>
            )}
          </div>
        </Link>
      );
    },
  },
  {
    id: 'slp',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          SLP
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    accessorFn: (row) => getSeatCountsFromMapData(row.mapData).slp,
  },
  {
    id: 'uwp',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          UWP
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    accessorFn: (row) => getSeatCountsFromMapData(row.mapData).uwp,
  },
  {
    id: 'ind',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          IND
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    accessorFn: (row) => getSeatCountsFromMapData(row.mapData).ind,
  },
  {
    accessorKey: 'createdAt',
    header: 'Submission Details',
    cell: ({ row }) => {
      const map = row.original;
      return (
        <div>
          <p className="text-sm text-muted-foreground">
            {map.createdAt
              ? new Date(map.createdAt?.toDate()).toLocaleString()
              : 'N/A'}
          </p>
          <p className="text-xs text-muted-foreground">
            {map.city && map.country
              ? `${map.city}, ${map.country}`
              : 'Unknown Location'}
          </p>
        </div>
      );
    },
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
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.ipAddress || 'N/A'}
      </span>
    ),
  },
  {
    accessorKey: 'likeCount',
    header: 'Likes',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <ThumbsUp className="h-4 w-4 text-green-500" />
        <span>{row.original.likeCount || 0}</span>
      </div>
    ),
  },
  {
    accessorKey: 'dislikeCount',
    header: 'Dislikes',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <ThumbsDown className="h-4 w-4 text-red-500" />
        <span>{row.original.dislikeCount || 0}</span>
      </div>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const map = row.original;
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this user map. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(map)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
  },
];
