import * as THREE from 'three';
import { Visit } from 'types';
import { MIN_POI_HEIGHT, MAX_POI_HEIGHT } from '../constants';
import { latLngToVector } from 'maths';
import { useRef, useLayoutEffect } from 'react';
import { Circle } from '@react-three/drei';

type MapPOIProps = {
    visit: Visit,
};

const MapPOI = (props: MapPOIProps) : JSX.Element => {
    const ref = useRef<THREE.Group>();
    const highestVisits = 200; // TODO: need to actually populate this.
    const highestVisitsLog10 = Math.log10(highestVisits);
    const MAX_LOG_HEIGHT = MAX_POI_HEIGHT/2;
    // TODO: need to handle clusters.
    const visitHours = props.visit.hours;
    const radius = 0.002;

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

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current!.lookAt(0, 0, 0);
        }
    });

    const baseMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, side: THREE.BackSide});
    const bodyMaterial = new THREE.MeshBasicMaterial({color: 0xFF0000});
    const margin = radius * 0.25;

    return (
        <group position={pos} >
            <Circle args={[radius + margin, 8]} />
        </group>
    );
};

export { MapPOI }
