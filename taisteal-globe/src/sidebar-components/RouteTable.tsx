import { Leg } from 'types'
import { POILink } from 'sidebar-components/POILink'
import { useState } from 'react'
import { useReactTable, createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, SortingState, getSortedRowModel, PaginationState } from '@tanstack/react-table'
import { useSelector } from 'react-redux'
import { RootState } from 'store'

type RouteTableProps = {
    legs: Leg[]
};

export const RouteTable = (props: RouteTableProps) => {
    // TODO: When sidebar is hidden and re-shown, table resets pagination.
    const [sorting, setSorting] = useState<SortingState>([
        {
            id: 'count',
            desc: true
        },
        {
            // TODO: this doesn't seem to really work...
            id: 'departureLocation',
            desc: false,
        }
    ]); 

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const columnHelper = createColumnHelper<Leg>();
    const columns = [
        columnHelper.accessor(leg => leg.departureLocation, {
            header: 'Origin',
            id: 'departureLocation',
            cell: location => <POILink location={location.getValue()} />,
            sortingFn: (legA, legB, columnId) => legA.original.departureLocation.name.localeCompare(legB.original.departureLocation.name),
        }),
        columnHelper.accessor(leg => leg.arrivalLocation, {
            header: 'Destination',
            id: 'arrivalLocation',
            cell: location => <POILink location={location.getValue()} />,
            sortingFn: (legA, legB, columnId) => legA.original.arrivalLocation.name.localeCompare(legB.original.arrivalLocation.name),
        }),
        columnHelper.accessor(leg => leg.mode, {
            header: 'Mode',
            id: 'mode',
            cell: mode => <p>{mode.getValue()}</p>,
            enableColumnFilter: true,
        }),
        columnHelper.accessor(leg => leg.count, {
            header: 'Count',
            id: 'count',
            cell: count=> <p>{count.getValue()}</p>,
            sortDescFirst: true,
            enableSorting: true,
        }),
        columnHelper.accessor(leg => leg.distance, {
            header: 'Distance',
            id: 'distance',
            cell: count=> <p>{count.getValue().toFixed(1)}km</p>,
            sortDescFirst: true,
            enableSorting: true,
            sortingFn: (legA, legB) => legA.original.distance - legB.original.distance,
        }),
    ];

    const table = useReactTable({
        data: props.legs,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    return (<>
        <table className="table-auto w-full border-collapse border border-zinc-500">
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
        <div className="flex items-center gap-2">
        <button
          className="border rounded p-1"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>'}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
        <span className="flex items-center gap-1">
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </strong>
        </span>
        <span className="flex items-center gap-1">
          | Go to page:
          <input
            type="number"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              table.setPageIndex(page)
            }}
            className="border p-1 rounded w-16"
          />
        </span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={e => {
            table.setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </>);
}

export const AllRouteTable = () => {
    const legs = useSelector((state: RootState) => state.legs);

    return (<>
        <p>Most-repeated routes:</p>
        <RouteTable legs={legs.legs} />
    </>);
}
