import GlobeCanvas from 'Globe';
import { Sidebar, SidebarPanel } from 'Sidebar';
import { AirRoute } from 'map-components/RaisedArc';
import { MapPOIGroup } from 'map-components/MapPOI';
import { POILink } from 'sidebar-components/POILink';
import { RouteTable } from 'sidebar-components/RouteTable';
import { VisitTable } from 'sidebar-components/VisitTable';
import { loadMapData } from 'data';
import { useEffect} from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState} from 'store';
import { SidebarTunnel, SidebarHighlightTunnel  } from 'routes'

export default function POIGroup() {
  useEffect(() => { loadMapData(); });

  let {data} = useParams();

  // TODO: add some verification here that the string is the expected format.
  let id_list: string[] = [];
  let label:string|null = null;
  if (data) {
      try {
        const params = new URLSearchParams(atob(data));
        if (params.has("ids")) {
            const id_list_str = params.get("ids")
            if (id_list_str) id_list = id_list_str.split(";");
        }
        if (params.has("label")) {
            label = params.get("label");
        }
      } catch (e) {
        console.log(e);
        id_list = [];
      }
  }
  const id_set = new Set<string>(id_list);

  const matchingVisits = useSelector((state: RootState) => state.visits.visits.filter((visit) => id_set.has(visit.location.id)));
  console.log(matchingVisits);

  const matchingLegs = useSelector((state: RootState) => state.legs.legs.filter((leg) => id_set.has(leg.departureLocation.id) || id_set.has(leg.arrivalLocation.id)));

  // Locations that are not in this country but are connected.
  const connectedLocations = new Set<string>();
  for (const leg of matchingLegs) {
    if (id_set.has(leg.departureLocation.id)) {
        connectedLocations.add(leg.arrivalLocation.id);
    }
    if (id_set.has(leg.arrivalLocation.id)) {
        connectedLocations.add(leg.departureLocation.id);
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

  return (
    <>
        {label && <>{renderLegs()}</>}
        {label && <MapPOIGroup visits={matchingVisits} cluster={false} />}
        <SidebarHighlightTunnel.In>
            {!label && (<SidebarPanel>
                <p>Error: could not find given country code.</p>
            </SidebarPanel>)}
            {label && (<SidebarPanel>
                <p>{label}</p>
                </SidebarPanel>)}
        </SidebarHighlightTunnel.In>
        <SidebarTunnel.In>
            {label && (<><SidebarPanel>
                <p className="text-xl text-center">Places in this group</p>
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
