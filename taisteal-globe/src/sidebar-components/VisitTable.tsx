import type { Visit } from 'types'
import { CountryLink, POILink } from 'sidebar-components/POILink'
import { useState, useEffect, useMemo } from 'react'
import { useReactTable, createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, SortingState, getSortedRowModel, PaginationState } from '@tanstack/react-table'
import { useSelector } from 'react-redux'
import { RootState } from 'store'

type VisitTableProps = {
    visits: Visit[]
};

const stringForHours = (hours:number):string => {
    if (hours === 1) {
        return "1 hour";
    }
    if (hours < 18) {
        return `${hours} hours`;
    }
    const days = Math.ceil(hours / 24.0);
    if (days < 50) {
        return `${days} days`;
    }
    const weeks = Math.ceil(hours / (24.0 * 7));
    if (weeks < 50) {
        return `${weeks} weeks`;
    }
    //const years = (hours / (24.0 * 365)).toFixed(1);
    const years = Math.floor(hours / (24.0 * 365));
    const remainingHours = hours - (years * 24 * 365);
    if (remainingHours > 100) {
        return `${years} years ${stringForHours(remainingHours)}`;
    }
    return `${years} years`;
}

export const VisitTable = (props: VisitTableProps) => {
    const [sorting, setSorting] = useState<SortingState>([
        {
            id: 'visitDuration',
            desc: true
        },
        {
            id: 'numVisits',
            desc: true,
        }
    ]); 

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const columnHelper = createColumnHelper<Visit>();
    const columns = [
        columnHelper.accessor(visit => visit.location, {
            header: 'Name',
            id: 'locationName',
            cell: location => <POILink location={location.getValue()} />,
            sortingFn: (rowA, rowB, columnId) => rowA.original.location.name.localeCompare(rowB.original.location.name),
        }),
        columnHelper.accessor(visit => visit.location, {
            header: 'Country',
            id: 'locationCountry',
            cell: location => <CountryLink countryCode={location.getValue().countryCode} countryName={location.getValue().countryName} />,
        }),
        columnHelper.accessor(visit => visit.location.type, {
            header: 'Type',
            id: 'locationType',
            cell: type_ => <p>{type_.getValue()}</p>,
        }),
        columnHelper.accessor(visit => visit, {
            header: 'Visits',
            id: 'numVisits',
            cell: visit => <p>{visit.getValue().numVisits}</p>,
            sortingFn: (rowA, rowB, columnId) => rowA.original.numVisits - rowB.original.numVisits,
        }),
        columnHelper.accessor(visit => visit, {
            header: 'Stay',
            id: 'visitDuration',
            cell: visit => <p>{stringForHours(visit.getValue().hours)}</p>,
            sortingFn: (rowA, rowB, columnId) => rowA.original.hours - rowB.original.hours,
         }),
    ];


    const table = useReactTable({
        data: props.visits,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    // TODO: this and the RouteTable should both use the same rendering (modulo
    // the merge button difference).
    return (<>
        <table className="table-auto w-full border-collapse border border-zinc-500 mt-2 mb-1">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  <th className="border border-zinc-600 bg-zinc-500" colSpan={1}>#</th>
                  {headerGroup.headers.map(header => {
                    return (
                      <th key={header.id} className="border border-zinc-600 bg-zinc-500" colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? 'cursor-pointer select-none'
                                : '',
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
                {table.getRowModel().rows.map((row, rowIndex) => (
                <tr key={row.id}>
                  <td className="border border-zinc-500 bg-zinc-200 text-center"><p className="">{table.getState().pagination.pageIndex*table.getState().pagination.pageSize + rowIndex + 1}</p></td>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className={"border border-zinc-500 text-center " + (rowIndex % 2 ? 'bg-zinc-200' : 'bg-zinc-50')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
        </table>
        <div className="flex items-center justify-center gap-2 h-10 pt-1">
        <button
          className="border rounded p-1 text-sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </button>
        <button
          className="border rounded p-1 text-sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <button
          className="border rounded p-1 text-sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>'}
        </button>
        <button
          className="border rounded p-1 text-sm"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
        <span className="flex items-center gap-1 text-sm">
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </strong>
        </span>
        <span className="flex items-center gap-1 text-sm">
          | Go to page:
          <input
            type="number"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              table.setPageIndex(page)
            }}
            className="border p-1 rounded w-12 text-sm"
          />
        </span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={e => {
            table.setPageSize(Number(e.target.value))
          }}
          className="text-sm"
        >
          {[5, 10, 25, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </>);
}

export const AllVisitTable = () => {
    const visits = useSelector((state: RootState) => state.visits);

    return (<>
        <p className="text-xl text-center">Places visited</p>
        <VisitTable visits={visits.visits} />
    </>);
}
