import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { AllRouteTable } from 'sidebar-components/RouteTable'
import { AllVisitTable } from 'sidebar-components/VisitTable'
import { SidebarTunnel, SidebarHighlightTunnel } from 'routes'
import { useSelector } from 'react-redux'
import { RootState } from 'store'

export default function VisitsOverview() {
    const visitStats = useSelector((state: RootState) => state.visits.stats);
    const numVisits = useSelector((state: RootState) => state.visits.visits.length);
    return (
        <>
            <AllMapPOIs />
            <SidebarHighlightTunnel.In>
                <SidebarPanel><p className="text-center font-bold font-cursive text-4xl tracking-wide leading-relaxed">Noah's life of travel</p>
                <p>Visited <span className="font-bold">{numVisits}</span> places in <span className="font-bold">{visitStats.numCountries}</span> countries & territories.</p>
                </SidebarPanel>
            </SidebarHighlightTunnel.In>
            <SidebarTunnel.In>
                <SidebarPanel><AllVisitTable /></SidebarPanel>
            </SidebarTunnel.In>
        </>
    );
}
