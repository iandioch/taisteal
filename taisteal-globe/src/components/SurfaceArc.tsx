import React, { useLayoutEffect, useRef } from 'react'
import { Canvas, useFrame, extend, ReactThreeFiber } from '@react-three/fiber'
import * as THREE from 'three'

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

type SurfaceArcProps = {
    start: THREE.Vector3,
    end: THREE.Vector3,
    smoothness: number,
    width: number,
    colour: THREE.Color
};

const SurfaceArc = (props: SurfaceArcProps) : JSX.Element => {
    const ref = useRef<THREE.Line>(null);
    const {start, end, smoothness, width, colour} = props;
    // Following https://stackoverflow.com/a/42721392
    var cb = new THREE.Vector3();
    var ab = new THREE.Vector3();
    var normal = new THREE.Vector3();
    cb.subVectors(new THREE.Vector3(), end);
    ab.subVectors(start, end);
    cb.cross(ab);
    normal.copy(cb).normalize();
    var angle = start.angleTo(end);
    var angleDelta = angle/(smoothness-1);
    const points: THREE.Vector3[] = [];
    for (var i = 0; i < smoothness; i++) {
        points.push(start.clone().applyAxisAngle(normal, angleDelta*i));
    }
    const material = new THREE.LineBasicMaterial({color: colour, linewidth: width});

    useFrame(() => {
        if (ref.current) {
            ref.current!.geometry.setFromPoints(points);
        }
    });
    return (
        <line_ ref={ref} >
            <bufferGeometry />
            <lineBasicMaterial attach="material" color={colour} linewidth={width} />
        </line_>
);
}
