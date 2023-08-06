import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { SidebarTunnel } from 'routes'

export default function Index() {
  return (
    <>
        <AllAirRoutes />
        <AllMapPOIs />
        <SidebarTunnel.In>
            <SidebarPanel>Index sidebar</SidebarPanel>
        </SidebarTunnel.In>
    </>
  );
}
