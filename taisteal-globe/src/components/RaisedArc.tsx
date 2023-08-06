import React, { useLayoutEffect, useRef, useEffect } from 'react'
import { Canvas, useFrame, extend, ReactThreeFiber } from '@react-three/fiber'
import * as THREE from 'three'
import { Leg } from 'types'
import { GLOBE_CIRCUMFERENCE, GLOBE_RADIUS } from '../constants'
import { latLngDistance, latLngMidpoint, latLngToVector, mapToRange } from 'maths'

type RaisedArcProps = {
    start: THREE.Vector3,
    controlPoint: THREE.Vector3,
    end: THREE.Vector3,
    smoothness: number,
    leg: Leg,
    material: THREE.Material,
};

const RaisedArc = (props: RaisedArcProps): JSX.Element => {
    const ref = useRef<THREE.Line>(null);
    const curve = new THREE.QuadraticBezierCurve3(props.start, props.controlPoint, props.end);
    useEffect(() => {
        if (ref.current) {
            ref.current!.geometry.setFromPoints(curve.getPoints(props.smoothness));
        }
    });
    return (<line_ ref={ref} material={props.material}>
        <bufferGeometry />
    </line_>);
};

const AIR_ROUTE_MATERIAL = new THREE.LineBasicMaterial({
    color: new THREE.Color(0xFFFFFF),
    linewidth: 3,
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
