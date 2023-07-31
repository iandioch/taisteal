import * as THREE from 'three'
import React, { useEffect, useRef, useState } from 'react'
import { Canvas, extend, Object3DNode, useFrame, ThreeElements } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';
import './Globe.css'
class TypedConicPolygonGeometry extends ConicPolygonGeometry {}
extend({TypedConicPolygonGeometry});


declare module '@react-three/fiber' {
    interface ThreeElements {
        typedConicPolygonGeometry: Object3DNode<TypedConicPolygonGeometry, typeof TypedConicPolygonGeometry>
    }
}

const GLOBE_RADIUS = 1;
const PATH_COUNTRIES_JSON = process.env.PUBLIC_URL + '/countries.json';

function loadJSON(url: string, callback: (data: any) => void) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400){
        // Success!
        console.log(`loadJSON(${url}) returned:\n${request.responseText}`);
        var data = JSON.parse(request.responseText);
        callback(data);
      } else {
        console.log("Status code error: " + request.status);
      }
    };

    request.onerror = function() {
      console.log("Error connecting.");
    };

    request.send();
}

function GlobeCanvas() {
  return (
    <div id="globe-container">
        <Canvas id="globe-canvas">
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <Globe></Globe>
            <OrbitControls />
        </Canvas>
    </div>
  )
}

function Globe() {
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
