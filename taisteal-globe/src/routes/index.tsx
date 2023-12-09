import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { AllRouteTable } from 'sidebar-components/RouteTable'
import { AllVisitTable } from 'sidebar-components/VisitTable'
import { SidebarTunnel, SidebarHighlightTunnel } from 'routes'
import { useSelector } from 'react-redux'
import { RootState } from 'store'

export default function Index() {
  const visitStats = useSelector((state: RootState) => state.visits.stats);
  const legStats = useSelector((state: RootState) => state.legs.stats);
  const numLegs = useSelector((state: RootState) => state.legs.legs.length);
  const numVisits = useSelector((state: RootState) => state.visits.visits.length);

  function prettifyDistance(d: number) {
    const rounded = Math.round(d);
    return rounded.toLocaleString("en-IE");
  }
  return (
    <>
        <AllAirRoutes />
        <AllMapPOIs />
        <SidebarHighlightTunnel.In>
            <SidebarPanel>
                <p className="text-center font-bold font-cursive text-4xl tracking-wide leading-relaxed">Noah's life of travel</p>
                <p>Logged <span className="font-bold">{legStats.totalCount}</span> trips across <span className="font-bold">{numLegs}</span> routes, a total of <span className="font-bold">{prettifyDistance(legStats.totalDistance)} km</span> of travelling.</p>
                <p>In that time, I visited <span className="font-bold">{numVisits}</span> places in <span className="font-bold">{visitStats.numCountries}</span> countries & territories.</p>
            </SidebarPanel>
        </SidebarHighlightTunnel.In>
        <SidebarTunnel.In>
            <SidebarPanel><AllRouteTable /></SidebarPanel>
            <SidebarPanel><AllVisitTable /></SidebarPanel>
        </SidebarTunnel.In>
    </>
  );
}
