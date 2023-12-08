import React, { useRef, useEffect } from 'react'
import { extend, ReactThreeFiber, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Leg } from 'types'
import { GLOBE_CIRCUMFERENCE, GLOBE_RADIUS } from '../constants'
import { latLngDistance, latLngMidpoint, latLngToVector, mapToRange } from 'maths'

// Fix conflict between SVG line and Three line
// https://github.com/pmndrs/react-three-fiber/issues/34
extend({ Line_ : THREE.Line});
// declare `line_` as a JSX element so that typescript doesn't complain
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'line_': ReactThreeFiber.Object3DNode<THREE.Line, typeof THREE.Line>,
        }
    }
}

type RaisedArcProps = {
    start: THREE.Vector3,
    controlPoint: THREE.Vector3,
    end: THREE.Vector3,
    smoothness: number,
    leg: Leg,
    material: THREE.Material,
};

const RaisedArcTraveller = (props: RaisedArcProps): JSX.Element => {
    // TODO: This should be an InstancedMesh
    const ref = React.useRef<THREE.Mesh>(null);
    const curve = new THREE.QuadraticBezierCurve3(props.start, props.controlPoint, props.end);
    // TODO: this should be derived from GLOBE_RADIUS or something, so that
    // if the globe size is changed then this is changed in proportion.
    const radius = 0.003; 
    const detail = 8;
    // TODO: These should be set from the actual speed the leg was travelled at!
    const durationSeconds = 1.5;
    // The interim should be increased if this is not a regular route.
    const interimSeconds = 2.0;
    let animState = Math.random()*(durationSeconds + interimSeconds);

    useFrame((state, delta) => {
        if (!ref.current) return;

        animState += delta;
        animState %= (durationSeconds+interimSeconds);
        if (animState > durationSeconds) {
            // TODO: this is a hack
            ref.current!.position.set(-100, -100, -100);
            return;
        }

        const point = curve.getPointAt(animState/durationSeconds);
        ref.current!.position.set(point.x, point.y, point.z);
        //ref.current!.position.needsUpdate = true;
    });
    return (
        <mesh ref={ref}>
            <sphereGeometry args={[radius, detail, detail]} />
            <meshBasicMaterial color={0x000000} />
        </mesh>
    )
}

const RaisedArc = (props: RaisedArcProps): JSX.Element => {
    const ref = useRef<THREE.Line>(null);
    const curve = new THREE.QuadraticBezierCurve3(props.start, props.controlPoint, props.end);
    useEffect(() => {
        if (ref.current) {
            ref.current!.geometry.setFromPoints(curve.getPoints(props.smoothness));
        }
    });
    return (<group><line_ ref={ref} material={props.material}>
        <bufferGeometry /></line_>
        <RaisedArcTraveller {...props} />
    </group>);
};

const AIR_ROUTE_MATERIAL = new THREE.LineBasicMaterial({
    color: new THREE.Color(0xFFFFFF),
    linewidth: 1,
    transparent: false,
});

type AirRouteProps = {
    leg: Leg,
};

const AirRoute = (props: AirRouteProps): JSX.Element => {
    const legDistance = latLngDistance(props.leg.departureLocation.latitude, props.leg.departureLocation.longitude, props.leg.arrivalLocation.latitude, props.leg.arrivalLocation.longitude);
    const controlPointHeight = mapToRange(0, GLOBE_CIRCUMFERENCE, GLOBE_RADIUS, GLOBE_RADIUS * 3, legDistance);
    const midpoint = latLngMidpoint(props.leg.departureLocation.latitude, props.leg.departureLocation.longitude, props.leg.arrivalLocation.latitude, props.leg.arrivalLocation.longitude);
    const start = latLngToVector(props.leg.departureLocation.latitude, props.leg.departureLocation.longitude);
    const end = latLngToVector(props.leg.arrivalLocation.latitude, props.leg.arrivalLocation.longitude);
    const controlPoint = latLngToVector(midpoint[0], midpoint[1], controlPointHeight); 
    const smoothness = Math.ceil(mapToRange(0, GLOBE_CIRCUMFERENCE, 4, 64, legDistance));

    return (
        <RaisedArc start={start} end={end} controlPoint={controlPoint} smoothness={smoothness} leg={props.leg} material={AIR_ROUTE_MATERIAL} />
    );
};

export { RaisedArc, AirRoute };
