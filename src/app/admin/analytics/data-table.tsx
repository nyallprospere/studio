
"use client"

import * as React from "react"
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
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { cn } from "@/lib/utils"
import * as XLSX from 'xlsx';


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [date, setDate] = React.useState<DateRange | undefined>()
  const [datePreset, setDatePreset] = React.useState('all');

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
  })
  
  React.useEffect(() => {
    const activationDateColumn = table.getColumn("publishDate");
    if (date?.from) {
        const filter = (row: any, columnId: string) => {
            const rowValue = row.getValue(columnId);
            if (!rowValue) return false;
            const rowDate = rowValue.toDate();
            const from = date.from!;
            const to = date.to ? new Date(date.to.getTime() + 86400000) : new Date(from.getTime() + 86400000);
            return rowDate >= from && rowDate < to;
        }
        activationDateColumn?.setFilterValue(filter)
    } else {
        activationDateColumn?.setFilterValue(undefined)
    }
  }, [date, table]);


  const handleDatePresetChange = (preset: string) => {
      setDatePreset(preset);
      const now = new Date();
      switch (preset) {
          case 'all':
              setDate(undefined);
              break;
          case 'day':
              setDate({ from: startOfDay(now), to: endOfDay(now) });
              break;
          case 'week':
              setDate({ from: startOfWeek(now), to: endOfWeek(now) });
              break;
          case 'month':
              setDate({ from: startOfMonth(now), to: endOfMonth(now) });
              break;
          case 'year':
              setDate({ from: startOfYear(now), to: endOfYear(now) });
              break;
          default:
              setDate(undefined);
      }
  }

  const handleExport = (format: 'csv' | 'xlsx') => {
    const tableData = table.getFilteredRowModel().rows.map(row => row.original);
    const worksheet = XLSX.utils.json_to_sheet(tableData as any[]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ad Analytics");
    XLSX.writeFile(workbook, `ad_analytics.${format}`);
  }

  return (
    <div>
        <div className="flex items-center justify-between py-4">
            <Input
            placeholder="Filter by ad name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
            />
             <div className="flex items-center gap-2">
                <Select
                    value={(table.getColumn("priority")?.getFilterValue() as string) ?? ""}
                    onValueChange={(value) => table.getColumn("priority")?.setFilterValue(value === 'all' ? '' : value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={datePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                </Select>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                            <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                            </>
                            ) : (
                            format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Custom Range</span>
                        )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(range) => { setDate(range); setDatePreset('custom'); }}
                        numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
                 <Button variant="outline" onClick={() => handleExport('xlsx')}>
                    <Download className="mr-2 h-4 w-4" /> Export
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
                    )
                })}
                </TableRow>
            ))}
            </TableHeader>
            <TableBody>
            {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                >
                    {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    ))}
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
  )
}

    