import GlobeCanvas from 'Globe';
import { Sidebar, SidebarPanel } from 'Sidebar';
import { AirRoute } from 'map-components/RaisedArc';
import { MapPOI } from 'map-components/MapPOI';
import { POILink } from 'sidebar-components/POILink';
import { RouteTable } from 'sidebar-components/RouteTable';
import { loadMapData } from 'data';
import { useEffect} from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState} from 'store';
import { SidebarTunnel } from 'routes'

export default function POI() {
  useEffect(() => { loadMapData(); });

  let {id} = useParams();

  const matchingVisits = useSelector((state: RootState) => state.visits.visits.filter((visit) => visit.location.id == id));
  console.log(matchingVisits);

  const visit = matchingVisits.length > 0 ? matchingVisits[0] : null;

  const matchingLegs = useSelector((state: RootState) => state.legs.legs.filter((leg) => leg.departureLocation.id == id || leg.arrivalLocation.id == id));

  const locationIds = new Set();
  for (const leg of matchingLegs) {
    locationIds.add(leg.departureLocation.id);
    locationIds.add(leg.arrivalLocation.id);
  }
  locationIds.delete(id);

  const connectedVisits = useSelector((state: RootState) => state.visits.visits.filter((visit) => locationIds.has(visit.location.id)));

  function renderLegs() {
    return <>
        {[...matchingLegs].map((leg, i) => {
            return <AirRoute key={leg.id} leg={leg} />
        })}
    </>
  }

  function renderConnectedPOIs() {
    return <>
        {[...connectedVisits].map((visit, i) => {
            return <MapPOI key={visit.location.id} visit={visit} />
        })}
    </>
  }

  return (
    <>
         {visit && <><MapPOI visit={visit} />{renderLegs()}{renderConnectedPOIs()}</>}
        <SidebarTunnel.In>
            {!visit && (<SidebarPanel>
                <p>Error: could not find location with given ID.</p>
            </SidebarPanel>)}
            {visit && (<><SidebarPanel>
                <p>{visit.location.name}</p>
                <p>{visit.location.type} in {visit.location.region} in {visit.location.countryName}.</p>
                </SidebarPanel><SidebarPanel>
                <p>Visited {visit.numVisits} times, for a total of {visit.hours < 40 ? visit.hours + " hours." : visit.days + " days."}</p>
            </SidebarPanel>
            <SidebarPanel>
                <p>Connected places:</p>
                { connectedVisits.map((visit, i) => <POILink key={visit.location.id} location={visit.location} />) }
            </SidebarPanel>
            <SidebarPanel>
                <p>Routes to and from {visit.location.name}:</p>
                <RouteTable legs={matchingLegs} />
            </SidebarPanel>
            </>)}
        </SidebarTunnel.In>
    </>
  );
}
