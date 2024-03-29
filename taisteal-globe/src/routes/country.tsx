import GlobeCanvas from 'Globe';
import { Sidebar, SidebarPanel } from 'Sidebar';
import { AirRoute } from 'map-components/RaisedArc';
import { MapPOI } from 'map-components/MapPOI';
import { POILink } from 'sidebar-components/POILink';
import { RouteTable } from 'sidebar-components/RouteTable';
import { VisitTable } from 'sidebar-components/VisitTable';
import { loadMapData } from 'data';
import { useEffect} from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState} from 'store';
import { SidebarTunnel, SidebarHighlightTunnel  } from 'routes'

export default function Country() {
  useEffect(() => { loadMapData(); });

  let {id} = useParams();

  const matchingVisits = useSelector((state: RootState) => state.visits.visits.filter((visit) => visit.location.countryCode == id));
  console.log(matchingVisits);

  const countryName = (matchingVisits.length > 0 ? matchingVisits[0].location.countryName : null);

  const matchingLegs = useSelector((state: RootState) => state.legs.legs.filter((leg) => leg.departureLocation.countryCode == id || leg.arrivalLocation.countryCode == id));

  // Locations that are not in this country but are connected.
  const connectedLocations = new Set<string>();
  for (const leg of matchingLegs) {
    if (leg.departureLocation.countryCode != id) {
        connectedLocations.add(leg.departureLocation.id);
    }
    if (leg.arrivalLocation.countryCode != id) {
        connectedLocations.add(leg.arrivalLocation.id);
    }
  }

  const connectedVisits = useSelector((state: RootState) => state.visits.visits.filter((visit) => connectedLocations.has(visit.location.id)));

  function renderLegs() {
    return <>
        {[...matchingLegs].map((leg, i) => {
            return <AirRoute key={leg.id} leg={leg} />
        })}
    </>
  }

  function renderMatchingVisits() {
    return <>
        {[...matchingVisits].map((visit, i) => {
            return <MapPOI key={visit.location.id} visit={visit} />
        })}
    </>
  }

  return (
    <>
         {countryName && <>{renderLegs()}{renderMatchingVisits()}</>}
        <SidebarHighlightTunnel.In>
            {!countryName && (<SidebarPanel>
                <p>Error: could not find given country code.</p>
            </SidebarPanel>)}
            {countryName && (<SidebarPanel>
                <p>{countryName}</p>
                </SidebarPanel>)}
        </SidebarHighlightTunnel.In>
        <SidebarTunnel.In>
            {countryName && (<><SidebarPanel>
                <p className="text-xl text-center">Places visited</p>
                <VisitTable visits={matchingVisits} />
            </SidebarPanel>
            <SidebarPanel>
                <p className="text-xl text-center">Connected places</p>
                <VisitTable visits={connectedVisits} />
            </SidebarPanel>
            <SidebarPanel>
                <p className="text-xl text-center">Connected routes</p>
                <RouteTable legs={matchingLegs} />
            </SidebarPanel>
            </>)}
        </SidebarTunnel.In>
    </>
  );
}
