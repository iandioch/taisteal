import GlobeCanvas from 'Globe'
import { Sidebar, SidebarPanel } from 'Sidebar'
import { loadMapData } from 'data'
import { useEffect} from 'react'

export default function Root() {
  useEffect(() => { loadMapData(); });
  return (
    <>
        <GlobeCanvas>
        </GlobeCanvas>
        <Sidebar>
            <SidebarPanel>
                <p>I'm a sidebar on the root path.</p>
            </SidebarPanel>
        </Sidebar>
    </>
  );
}
