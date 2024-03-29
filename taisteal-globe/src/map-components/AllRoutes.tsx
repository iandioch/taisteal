import * as THREE from 'three'
import { RootState } from 'store';
import { useSelector } from 'react-redux';
import { SurfaceArc } from './SurfaceArc';
import {  AirRoute } from './RaisedArc';
import { latLngToVector, latLngDistance, mapToRange } from 'maths';
import { GLOBE_CIRCUMFERENCE } from '../constants'

export function AllSurfaceRoutes() {
    const legs = useSelector((state: RootState) => state.legs); 
    console.log(legs.legs.length);
    const colour = new THREE.Color(0xffffff);
    var start : THREE.Vector3;
    var end : THREE.Vector3;
    return (
        <>
            {[...legs.legs].map((leg, i) => {
                start = latLngToVector(leg.departureLocation.latitude, leg.departureLocation.longitude);
                end = latLngToVector(leg.arrivalLocation.latitude, leg.arrivalLocation.longitude);
                const legDistance = latLngDistance(leg.departureLocation.latitude, leg.departureLocation.longitude, leg.arrivalLocation.latitude, leg.arrivalLocation.longitude);
                const smoothness = Math.ceil(mapToRange(0, GLOBE_CIRCUMFERENCE, 16, 256, legDistance));
                return <SurfaceArc key={leg.id} start={start} end={end} smoothness={smoothness} width={3} colour={colour}/>
            })}
        </>
    );
}

export function AllAirRoutes() {
    const legs = useSelector((state: RootState) => state.legs); 
    console.log("all air routes: " + legs.legs.length);
    return (
        <>
            {[...legs.legs].map((leg, i) => {
                return <AirRoute key={leg.id} leg={leg} />
            })}
        </>
    );
}
