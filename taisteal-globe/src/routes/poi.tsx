import GlobeCanvas from 'Globe';
import { Sidebar, SidebarPanel } from 'Sidebar';
import { AllAirRoutes } from 'components/AllRoutes';
import { MapPOI } from 'components/MapPOI';
import { loadMapData } from 'data';
import { useEffect} from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState} from 'store';

export default function POI() {
  useEffect(() => { loadMapData(); });

  let {id} = useParams();

  const matchingVisits = useSelector((state: RootState) => state.visits.visits.filter((visit) => visit.location.id == id));
  console.log(matchingVisits);

  const visit = matchingVisits.length > 0 ? matchingVisits[0] : null;

  return (
    <>
        <GlobeCanvas>
            {visit && <MapPOI visit={visit} />}
        </GlobeCanvas>
        <Sidebar>
            {!visit && (<SidebarPanel>
                <p>Error: could not find location with given ID.</p>
            </SidebarPanel>)}
            {visit && (<><SidebarPanel>
                <p>{visit.location.name}</p>
                <p>{visit.location.type} in {visit.location.region} in {visit.location.countryName}.</p>
                </SidebarPanel><SidebarPanel>
                <p>Visited {visit.numVisits} times, for a total of {visit.hours < 40 ? visit.hours + " hours." : visit.days + " days."}</p>
            </SidebarPanel></>)}
        </Sidebar>
    </>
  );
}
