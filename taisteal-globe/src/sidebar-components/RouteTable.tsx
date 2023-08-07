import { Leg } from 'types'
import { POILink } from 'sidebar-components/POILink'
import { useState } from 'react'
import { useReactTable, createColumnHelper, flexRender, getCoreRowModel, SortingState, getSortedRowModel } from '@tanstack/react-table'
import { useSelector } from 'react-redux'
import { RootState } from 'store'

type RouteTableProps = {
    legs: Leg[]
};

export const RouteTable = (props: RouteTableProps) => {
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
    const columnHelper = createColumnHelper<Leg>();
    const columns = [
        columnHelper.accessor(leg => leg.departureLocation, {
            header: 'Origin',
            id: 'departureLocation',
            cell: location => <POILink location={location.getValue()} />,
        }),
        columnHelper.accessor(leg => leg.arrivalLocation, {
            header: 'Destination',
            id: 'arrivalLocation',
            cell: location => <POILink location={location.getValue()} />,
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
    });
    return (<>
        <table>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <th key={header.id} colSpan={header.colSpan}>
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
                {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
        </table>
    </>);
}

export const AllRouteTable = () => {
    const legs = useSelector((state: RootState) => state.legs);

    return (<>
        <p>Most-repeated routes:</p>
        <RouteTable legs={legs.legs} />
    </>);
}
