import * as THREE from 'three'
import { RootState } from 'store';
import { useSelector } from 'react-redux';
import { SurfaceArc} from 'components/SurfaceArc';
import { latLngToVector, latLngDistance, mapToRange } from 'maths';

export function AllRoutes() {
    const legs = useSelector((state: RootState) => state.legs); 
    console.log(legs.legs.length);
    const colour = new THREE.Color(0xffffff);
    var start : THREE.Vector3;
    var end : THREE.Vector3;
    const globeCircumference = 40000;
    return (
        <>
            {[...legs.legs].map((leg, i) => {
                start = latLngToVector(leg.departureLocation.latitude, leg.departureLocation.longitude);
                end = latLngToVector(leg.arrivalLocation.latitude, leg.arrivalLocation.longitude);
                const legDistance = latLngDistance(leg.departureLocation.latitude, leg.departureLocation.longitude, leg.arrivalLocation.latitude, leg.arrivalLocation.longitude);
                const smoothness = Math.ceil(mapToRange(0, globeCircumference, 16, 256, legDistance));
                const legId = leg.departureLocation.id + "-" + leg.arrivalLocation.id + "-" + leg.mode;
                return <SurfaceArc key={legId} start={start} end={end} smoothness={smoothness} width={3} colour={colour}/>
            })}
        </>
    );
}
