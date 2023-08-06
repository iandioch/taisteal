import * as THREE from 'three'
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { Canvas, extend, Object3DNode, useFrame, ThreeElements } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';
import { loadJSON} from 'data'
import { GLOBE_RADIUS, PATH_COUNTRIES_JSON, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, CONTROLS_DAMPING_FACTOR, CONTROLS_ROTATE_SPEED, CONTROLS_ZOOM_SPEED } from './constants'
import './Globe.css'
class TypedConicPolygonGeometry extends ConicPolygonGeometry {}
extend({TypedConicPolygonGeometry});


declare module '@react-three/fiber' {
    interface ThreeElements {
        typedConicPolygonGeometry: Object3DNode<TypedConicPolygonGeometry, typeof TypedConicPolygonGeometry>
    }
}


type GlobeCanvasProps = {}
function GlobeCanvas(props: PropsWithChildren<GlobeCanvasProps>) {
  return (
    <div id="globe-container">
        <div id="globe-canvas">
            <Canvas>
                <ambientLight />
                <pointLight position={[10, 10, 10]} />
                <Globe>{props.children}</Globe>
                <OrbitControls
                    minDistance={MIN_CAMERA_DISTANCE}
                    maxDistance={MAX_CAMERA_DISTANCE}
                    enablePan={false}
                    enableDamping={true}
                    dampingFactor={CONTROLS_DAMPING_FACTOR}
                    rotateSpeed={CONTROLS_ROTATE_SPEED}
                    zoomSpeed={CONTROLS_ZOOM_SPEED}
                    />
                <PerspectiveCamera
                    makeDefault
                    fov={30}
                    aspect={2}
                    near={0.025}
                    far={12}
                    position={[0, 0, 2]}
                    />
            </Canvas>
        </div>
    </div>
  )
}

type GlobeProps = {}

function Globe(props: PropsWithChildren<GlobeProps>) {
    /*const group = useRef<THREE.Group>(null!);
    const meshBasicMaterial = useRef<THREE.MeshBasicMaterial>(null!);
    const sphereGeometry = useRef<THREE.SphereGeometry>(null!);*/


    return (
        <group>{/* group containing globe and attachments */}
            <group>{/* group containing globe obj itself */}
                <mesh>
                    <sphereGeometry args={[GLOBE_RADIUS*0.995, 64, 64]} />
                    <meshBasicMaterial color={0xAAAAAA} />
                </mesh>
                <GlobeCountries />
                {props.children}
            </group>
        </group>
    )
}

function GlobeCountries() {
    const landMaterial = <meshBasicMaterial color={0xDDDDDD} side={THREE.FrontSide}  />

    const [countryData, setCountryData] = useState([]);
    const [fineness] = useState(2);

    useEffect(() => {
        loadJSON(PATH_COUNTRIES_JSON, (data) => {
            setCountryData(data.features);
        });

        return () => {
            // Do any cleanup here.
        };
    }, []);

    return (
        <group>{/* group containing country geoms */}
            {countryData?.map((obj, i) => {
                const geometry = obj['geometry'];
                const polygons = geometry['type'] === 'Polygon' ? [geometry['coordinates']] : geometry['coordinates'];
                return (<group key={"country" + i}>{/* single country */}
                    {polygons?.map((obj, i) => {
                        return (<mesh key={'countryGeomMesh' + i}>
                            <typedConicPolygonGeometry key={'countryGeom' + i} args={[obj, GLOBE_RADIUS*0.9, GLOBE_RADIUS, false, true, false, fineness]} />
                            {landMaterial}
                        </mesh>)
                    })}
                    </group>
                )
            })}
        </group>
    )
}

export default GlobeCanvas;
