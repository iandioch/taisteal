import { modeToString, makeLegID } from 'types'
import type { Leg, } from 'types'
import { POILink } from 'sidebar-components/POILink'
import { useState, useEffect, useMemo } from 'react'
import { useReactTable, createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, SortingState, getSortedRowModel, PaginationState } from '@tanstack/react-table'
import { useSelector } from 'react-redux'
import { RootState } from 'store'

type RouteTableProps = {
    legs: Leg[]
};

const mergeLegs = (givenLegs: Leg[]):Leg[] => {
    const legs = new Map<string, Leg>(); 
    for (const leg of givenLegs) {
        var id = leg.id;
        const swap = (leg.departureLocation.id > leg.arrivalLocation.id);
        if (swap) {
            id = makeLegID(leg.arrivalLocation, leg.departureLocation, leg.mode);
        }
        if (legs.has(id)) {
            legs.get(id)!.count += leg.count;
        } else {
            legs.set(id, ({
                departureLocation: (swap? leg.arrivalLocation : leg.departureLocation),
                arrivalLocation: (swap? leg.departureLocation : leg.arrivalLocation),
                mode: leg.mode,
                count: leg.count,
                distance: leg.distance,
                id: id,
            }));
        }
    }
    return Array.from(legs.values());
}

export const RouteTable = (props: RouteTableProps) => {
    const [merged, setMerged] = useState<boolean>(false);

    var [renderedLegs, setRenderedLegs] = useState<Leg[]>(props.legs);
    const mergedLegs = useMemo(() => mergeLegs(props.legs), [props.legs]);

    useEffect(() => {
        if(merged) {
            setRenderedLegs(mergedLegs);
            return;
        }
        setRenderedLegs(props.legs);
    }, [merged, mergedLegs, setRenderedLegs]);

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
            cell: mode => <p>{modeToString(mode.getValue())}</p>,
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
        data: renderedLegs,
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
                <tr key={row.id} className={"text-center " + (rowIndex % 2 ? 'bg-zinc-200' : 'bg-zinc-50')}>
                  <td className=""><p>{table.getState().pagination.pageIndex*table.getState().pagination.pageSize + rowIndex + 1}</p></td>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
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
        <button
          className="border rounded p-1 text-sm"
          onClick={() => setMerged(!merged)}
        >
          {merged? "Unmerge" : "Merge"}
        </button>
      </div>
    </>);
}

export const AllRouteTable = () => {
    const legs = useSelector((state: RootState) => state.legs);

    return (<>
        <p className="text-xl text-center">Routes travelled</p>
        <RouteTable legs={legs.legs} />
    </>);
}
