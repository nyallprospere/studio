'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import * as XLSX from 'xlsx';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleExport = (format: 'csv' | 'xlsx') => {
    const tableData = table.getFilteredRowModel().rows.map((row) => {
      const original = row.original as any;
      const { slp, uwp, ind } = (row.original as any).seatCounts;
      return {
        ...original,
        slp,
        uwp,
        ind,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MapSubmissions');
    XLSX.writeFile(workbook, `map_submissions.${format}`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between py-4 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filter by city..."
            value={(table.getColumn('city')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('city')?.setFilterValue(event.target.value)
            }
            className="max-w-xs"
          />
          <Input
            placeholder="Filter by country..."
            value={
              (table.getColumn('country')?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn('country')?.setFilterValue(event.target.value)
            }
            className="max-w-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            onValueChange={(value) =>
              table
                .getColumn('slp')
                ?.setFilterValue(
                  value === 'all'
                    ? undefined
                    : (value === 'slp_wins'
                    ? (val: number) => val >= 9
                    : (val: number) => val < 9)
                )
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by winner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Maps</SelectItem>
              <SelectItem value="slp_wins">SLP Wins</SelectItem>
              <SelectItem value="uwp_wins">UWP Wins</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport('xlsx')}>
            <Download className="mr-2 h-4 w-4" /> Export XLSX
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
