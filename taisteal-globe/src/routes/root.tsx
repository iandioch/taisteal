import GlobeCanvas from 'Globe'
import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { loadMapData } from 'data'
import { useEffect} from 'react'

export default function Root() {
  useEffect(() => { loadMapData(); });
  return (
    <>
        <GlobeCanvas key="globe">
            <AllAirRoutes />
            <AllMapPOIs />
        </GlobeCanvas>
        <Sidebar renderHomeButton={false}>
            <SidebarPanel>
                <p>I'm a sidebar on the root path.</p>
            </SidebarPanel>
        </Sidebar>
    </>
  );
}
