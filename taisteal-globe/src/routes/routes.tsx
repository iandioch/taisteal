import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { AllRouteTable } from 'sidebar-components/RouteTable'
import { AllVisitTable } from 'sidebar-components/VisitTable'
import { SidebarTunnel, SidebarHighlightTunnel } from 'routes'
import { useSelector } from 'react-redux'
import { RootState } from 'store'

export default function RoutesOverview() {
    function prettifyDistance(d: number) {
        const rounded = Math.round(d);
        return rounded.toLocaleString("en-IE");
    }
    const legStats = useSelector((state: RootState) => state.legs.stats);
    const numLegs = useSelector((state: RootState) => state.legs.legs.length);
    return (
        <>
            <AllAirRoutes />
            <SidebarHighlightTunnel.In>
                <SidebarPanel>
                    <p className="text-center font-bold font-cursive text-4xl tracking-wide leading-relaxed">Noah's life of travel</p>
                    <p>Logged <span className="font-bold">{legStats.totalCount}</span> trips across <span className="font-bold">{numLegs}</span> routes, a total of <span className="font-bold">{prettifyDistance(legStats.totalDistance)} km</span> of travelling.</p>
                </SidebarPanel>
            </SidebarHighlightTunnel.In>
            <SidebarTunnel.In>
                <SidebarPanel><AllRouteTable /></SidebarPanel>
            </SidebarTunnel.In>
        </>
    );
}
