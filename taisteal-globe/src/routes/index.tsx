import { Sidebar, SidebarPanel } from 'Sidebar'
import { AllAirRoutes } from 'map-components/AllRoutes'
import { AllMapPOIs } from 'map-components/MapPOI'
import { AllRouteTable } from 'sidebar-components/RouteTable'
import { AllVisitTable } from 'sidebar-components/VisitTable'
import { SidebarTunnel, SidebarHighlightTunnel, getRouteForVisitOverview, getRouteForRouteOverview } from 'routes'
import { useSelector } from 'react-redux'
import { RootState } from 'store'
import { Link } from 'react-router-dom'
//import { GiShipWheel } from "react-icons/gi";
/*import GiShipWheel from '@react-icons/all-files/gi/GiShipWheel';*/

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
            <div className="grid grid-cols-2 gap-2 w-full mx-2.5 mt-2.5 text-gray-800 text-sm text-center">
                <Link to={getRouteForVisitOverview()} className="">
                    <div className="taisteal-sidebar-panel bg-slate-50" style={{margin: 0, backgroundImage: "url('mother.jpeg')", backgroundPosition: "center", backgroundSize: "cover", aspectRatio: 1, contain: 'layout'}}>
                        {/* TODO: this gradient should be stronger when the link is hovered */}
                        <div style={{position: 'absolute', opacity: 0.6, left: 0, top: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(255, 255, 255, 1.0) 20%, rgba(255, 255, 255, 0) 70%)', zIndex: 1}}></div>
                        <p style={{position: 'absolute', marginLeft: 'auto', marginRight: 'auto', left: 0, right: 0, textAlign: 'center', zIndex: 2}}>Places visited</p>
                    </div>
                </Link>
                <Link to={getRouteForRouteOverview()} className="">
                    <div className="taisteal-sidebar-panel bg-slate-50" style={{margin: 0, backgroundImage: "url('aeroplane.jpeg')", backgroundPosition: "center", backgroundSize: "cover", aspectRatio: 1, contain: 'layout'}}>
                        <div style={{position: 'absolute', opacity: 0.6, left: 0, top: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(255, 255, 255, 1.0) 20%, rgba(255, 255, 255, 0) 70%)', zIndex: 1}}></div>
                        <p style={{position: 'absolute', marginLeft: 'auto', marginRight: 'auto', left: 0, right: 0, textAlign: 'center', zIndex: 2}}>Routes travelled</p>
                    </div>
                </Link>
            </div>
        </SidebarTunnel.In>
    </>
  );
}
