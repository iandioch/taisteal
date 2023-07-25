import * as THREE from 'three'
import React, { useEffect, useRef, useState } from 'react'
import { Canvas, extend, Object3DNode, useFrame, ThreeElements } from '@react-three/fiber'
import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';
class TypedConicPolygonGeometry extends ConicPolygonGeometry {}
extend({TypedConicPolygonGeometry});

declare module '@react-three/fiber' {
    interface ThreeElements {
        typedConicPolygonGeometry: Object3DNode<TypedConicPolygonGeometry, typeof TypedConicPolygonGeometry>
    }
}

const GLOBE_RADIUS = 1;
const PATH_COUNTRIES_JSON = 'static/countries.json';

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

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!)
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)
  useFrame((state, delta) => (ref.current.rotation.x += delta))
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

function GlobeCanvas() {
  return (
    <div id="globe-container">
        <Canvas id="globe-canvas">
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <Box position={[-1.2, 0, 0]} />
            <Box position={[1.2, 0, 0]} />
            <Globe></Globe>
        </Canvas>
    </div>
  )
}

function Globe() {
    /*const group = useRef<THREE.Group>(null!);
    const meshBasicMaterial = useRef<THREE.MeshBasicMaterial>(null!);
    const sphereGeometry = useRef<THREE.SphereGeometry>(null!);*/

    const landMaterial = <meshBasicMaterial color={0xDDDDDD} side={THREE.FrontSide}  />

    const [countryData, setCountryData] = useState([]);
    const [fineness, setFineness] = useState(2);

    useEffect(() => {
        loadJSON(PATH_COUNTRIES_JSON, (data) => {
            console.log(data);
            setCountryData(data.features);
        });

        return () => {
            // Do any cleanup here.
        };
    },[countryData]);

    return (
        <group> {/* group containing globe and attachments */}
            <group> {/* group containing globe obj itself */}
                <mesh>
                    <sphereGeometry args={[GLOBE_RADIUS*0.995, 64, 64]} /> 
                    <meshBasicMaterial color={0xAAAAAA} />
                </mesh>
                <group> {/* group containing country geoms */}
                    {countryData.map((obj, i) => {
                        const geometry = obj['geometry'];
                        const polygons = geometry['type'] === 'Polygon' ? [geometry['coordinates']] : geometry['coordinates'];
                        return (<group> {/* single country */}
                            {polygons.map((obj, i) => {
                                return (<mesh>
                                    <typedConicPolygonGeometry args={[obj['coords'], GLOBE_RADIUS*0.9, GLOBE_RADIUS, false, true, false, fineness]} />
                                    {landMaterial}
                                </mesh>)
                            })}
                        </group>)
                    })}
                </group>
            </group>
            <group> {/* group containing points */}

            </group>
        </group>
    )
}

export default GlobeCanvas;
