import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { AllRouteTable } from 'sidebar-components/RouteTable'
import { AllVisitTable } from 'sidebar-components/VisitTable'
import { SidebarTunnel } from 'routes'

export default function Index() {
  return (
    <>
        <AllAirRoutes />
        <AllMapPOIs />
        <SidebarTunnel.In>
            <SidebarPanel>Noah's travel globe</SidebarPanel>
            <SidebarPanel><AllRouteTable /></SidebarPanel>
            <SidebarPanel><AllVisitTable /></SidebarPanel>
        </SidebarTunnel.In>
    </>
  );
}
