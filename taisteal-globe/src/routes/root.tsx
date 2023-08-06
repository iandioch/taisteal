import GlobeCanvas from 'Globe'
import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { loadMapData } from 'data'
import { useEffect, useRef } from 'react'
import { Hud, Html } from '@react-three/drei'
import { Outlet } from 'react-router-dom'
import { SidebarTunnel } from 'routes'


export default function Root() {
  useEffect(() => { loadMapData(); });

  const outerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={outerRef} style={{height: "100%"}}>
        <GlobeCanvas key="globe">
            <Outlet />
        </GlobeCanvas>
        <Sidebar renderHomeButton={false}>
            <SidebarTunnel.Out />
        </Sidebar>
    </div>
  );
}
