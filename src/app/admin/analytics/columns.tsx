
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Ad } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const columns: ColumnDef<Ad>[] = [
  {
    accessorKey: "name",
    header: "Ad Name",
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      const variant = priority === 'high' ? 'destructive' : priority === 'medium' ? 'secondary' : 'outline';
      return <Badge variant={variant} className="capitalize">{priority}</Badge>
    }
  },
  {
    accessorKey: "position",
    header: "Position",
    cell: ({ row }) => <span className="capitalize">{row.getValue("position")}</span>
  },
  {
    accessorKey: "publishDate",
    header: "Activation Date",
    cell: ({ row }) => {
        const date = row.getValue("publishDate") as any;
        return date ? format(date.toDate(), 'MMM d, yyyy') : 'N/A';
    }
  },
  {
    accessorKey: "unpublishDate",
    header: "Deactivation Date",
    cell: ({ row }) => {
        const date = row.getValue("unpublishDate") as any;
        return date ? format(date.toDate(), 'MMM d, yyyy') : 'N/A';
    }
  },
  {
    accessorKey: "revenuePerClick",
    header: "RPC ($)",
    cell: ({ row }) => {
        const rpc = parseFloat(row.getValue("revenuePerClick") || "0");
        return `$${rpc.toFixed(2)}`;
    }
  },
  {
    accessorKey: "clicks",
    header: "# of Clicks",
    cell: ({ row }) => {
        const ad = row.original;
        return (
            <Button asChild variant="link" className="p-0 h-auto">
                <Link href={`/admin/analytics/${ad.id}`}>
                    {ad.clicks || 0}
                </Link>
            </Button>
        )
    },
  },
  {
    accessorKey: "impressions",
    header: "Impressions",
    cell: ({ row }) => row.getValue("impressions") || 0,
  },
  {
    id: "estimatedRevenue",
    header: "Estimated Revenue ($)",
    cell: ({ row }) => {
      const rpc = parseFloat(row.getValue("revenuePerClick") || "0");
      const clicks = parseInt(row.getValue("clicks") || "0");
      const estimatedRevenue = rpc * clicks;
      return `$${estimatedRevenue.toFixed(2)}`;
    }
  },
]
