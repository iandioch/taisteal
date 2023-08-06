import GlobeCanvas from 'Globe'
import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'components/AllRoutes'
import { AllMapPOIs } from 'components/MapPOI'
import { loadMapData } from 'data'
import { useEffect} from 'react'

export default function Root() {
  useEffect(() => { loadMapData(); });
  return (
    <>
        <GlobeCanvas>
            {/*<AllAirRoutes />*/}
            <AllMapPOIs />
        </GlobeCanvas>
        <Sidebar>
            <SidebarPanel>
                <p>I'm a sidebar on the root path.</p>
            </SidebarPanel>
        </Sidebar>
    </>
  );
}
