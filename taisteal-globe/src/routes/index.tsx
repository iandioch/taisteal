import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { AllRouteTable } from 'sidebar-components/RouteTable'
import { AllVisitTable } from 'sidebar-components/VisitTable'
import { SidebarTunnel, SidebarHighlightTunnel } from 'routes'

export default function Index() {
  return (
    <>
        <AllAirRoutes />
        <AllMapPOIs />
        <SidebarHighlightTunnel.In>
            <SidebarPanel>Noah's travel globe</SidebarPanel>
        </SidebarHighlightTunnel.In>
        <SidebarTunnel.In>
            <SidebarPanel><AllRouteTable /></SidebarPanel>
            <SidebarPanel><AllVisitTable /></SidebarPanel>
        </SidebarTunnel.In>
    </>
  );
}
