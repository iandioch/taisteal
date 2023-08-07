import * as THREE from 'three';
import { Visit } from 'types';
import { POI_COLOUR_SCALE, POI_RADIUS, MIN_POI_HEIGHT, MAX_POI_HEIGHT } from '../constants';
import { latLngToVector } from 'maths';
import { useRef, useLayoutEffect, useState } from 'react';
import { Circle, Cylinder, Hud, Html, Sphere } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { getRouteForPOI } from 'routes'
import { RootState } from 'store';
import { useSelector } from 'react-redux';
import './MapPOI.css'

type MapPOIProps = {
    visit: Visit,
};

const MapPOI = (props: MapPOIProps) : JSX.Element => {
    const [hovered, setHover] = useState(false);
    const navigate = useNavigate();
    const longestVisit = useSelector((state: RootState) => state.visits.longestVisit);
    const highestVisits = longestVisit ? longestVisit.hours : 1000;
    const highestVisitsLog10 = Math.log10(highestVisits);
    const MAX_LOG_HEIGHT = MAX_POI_HEIGHT/2;
    // TODO: need to handle clusters.
    const visitHours = props.visit.hours;
    const radius = POI_RADIUS;

    // Use a log-based height, because in a normal case, the place where
    // you live will have an order of magnitude more visit time than
    // other places you've visited, and will be 100s of times larger in
    // a linear scale.
    let height = MIN_POI_HEIGHT + (Math.log10(visitHours)/highestVisitsLog10)*MAX_LOG_HEIGHT;
    // However, also use a linear-scaled height in addition, because
    // we don't want somewhere you stayed for 1000 hours to be the same
    // height at a glance as somewhere you stayed for 120.
    height += (visitHours / highestVisits) * (MAX_POI_HEIGHT - MAX_LOG_HEIGHT - MIN_POI_HEIGHT);

    const pos = latLngToVector(props.visit.location.latitude, props.visit.location.longitude);

    const baseMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, side: THREE.BackSide});
    const bodyMaterial = new THREE.MeshBasicMaterial({color: POI_COLOUR_SCALE(Math.log10(visitHours)/Math.log10(highestVisits)).hex()});
    const margin = radius * 0.25;

    return (
        <group
            position={pos}
            onUpdate={(self) => self.lookAt(0, 0, 0)}
            onPointerOver={e => {setHover(true); e.stopPropagation();}}
            onPointerOut={e => setHover(false)}
            onClick={e => {e.stopPropagation(); navigate(getRouteForPOI(props.visit.location.id));}}>
            <mesh material={baseMaterial}>
                <Circle args={[radius + margin, 8]} material={baseMaterial} />
            </mesh>
            <Cylinder args={[radius, radius*0.8, height, 8, 1, false]} material={bodyMaterial} position={[0, 0, -height/2]} rotation={[-Math.PI/2, 0, 0]}/>
            {hovered && 
                <Html prepend center style={{pointerEvents: 'none'}}> 
                    <p className="poi-label">{props.visit.location.name}</p>
                </Html>
            }
        </group>
    );
};

const AllMapPOIs = ():JSX.Element => {
    const visits = useSelector((state: RootState) => state.visits);
    console.log("All visits:", visits.visits.length);
    return (
        <>
            {[...visits.visits].map((visit, i) => {
                return <MapPOI key={visit.location.id} visit={visit} />
            })}
        </>
    );
}

export { MapPOI, AllMapPOIs }
