import GlobeCanvas from 'Globe'
import { Sidebar, SidebarPanel } from 'Sidebar'

export default function Root() {
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
